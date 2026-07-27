import os

for _dir in [os.path.dirname(os.path.abspath(__file__)), os.getcwd()]:
    _env_path = os.path.join(_dir, '.env')
    if os.path.exists(_env_path):
        with open(_env_path) as _f:
            for line in _f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())
        break

import json
import ssl
import time
import math
import smtplib
import http.client
import traceback
from email.mime.text import MIMEText
try:
    from duckduckgo_search import DDGS
    HAS_DDG = True
except ImportError:
    HAS_DDG = False
from flask import Flask, render_template, request, jsonify

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'soplus-firebase-2026'

GEMINI_KEY = os.environ.get("GEMINI_KEY", "")
ADMIN_AI_KEY = os.environ.get("ADMIN_AI_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
OPENROUTER_MODEL_2 = os.environ.get("OPENROUTER_MODEL_2", "meta-llama/llama-3.1-8b-instruct:free")
GEMINI_MODEL = "gemini-3.1-flash-lite"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


# ─── AI POST: OpenRouter primário, Gemini fallback ─────────

def openrouter_post(messages, model=None, max_tokens=2048, temperature=0.7, timeout=30):
    if not OPENROUTER_KEY:
        return None, "OPENROUTER_KEY não configurada"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "HTTP-Referer": "https://soplus.pt",
        "X-OpenRouter-Title": "S&O+ Ultra Workspace"
    }
    body = json.dumps({
        "model": model or OPENROUTER_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    })
    conn = http.client.HTTPSConnection("openrouter.ai", timeout=timeout, context=SSL_CTX)
    conn.request("POST", "/api/v1/chat/completions", body=body, headers=headers)
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None, f"Resposta inválida do OpenRouter (HTTP {resp.status})"
    if "error" in data:
        return None, data["error"].get("message", str(data["error"]))
    if "choices" in data and data["choices"]:
        content = data["choices"][0].get("message", {}).get("content", "")
        return content, None
    return None, "Resposta vazia do OpenRouter"


def gemini_post(model, payload, timeout=30, api_key=None):
    key = api_key or GEMINI_KEY
    if not key:
        return {"error": {"message": "GEMINI_KEY não configurada", "code": 401}}
    headers = {"Content-Type": "application/json", "x-goog-api-key": key}
    body = json.dumps(payload)
    conn = http.client.HTTPSConnection('generativelanguage.googleapis.com', timeout=timeout, context=SSL_CTX)
    conn.request('POST', f'/v1beta/models/{model}:generateContent', body=body, headers=headers)
    resp = conn.getresponse()
    data = resp.read().decode()
    conn.close()
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return {"error": {"message": f"Resposta inválida do Gemini (HTTP {resp.status})", "code": 502}}


def ai_post(user_prompt, system_prompt=None, model=None, max_tokens=2048, temperature=0.7, json_mode=False, timeout=30, ai_context=None):
    """
    Envia pedido à IA com suporte a regras de personalização.
    ai_context: dict com email, ip, mac do utilizador para resolver regras.
    """
    rules_context = {}
    if ai_context:
        rules_context = resolve_ai_rules(
            email=ai_context.get('email', ''),
            ip=ai_context.get('ip', ''),
            mac=ai_context.get('mac', '')
        )

    final_system = build_ai_prompt_with_rules(user_prompt, system_prompt or '', rules_context)

    messages = []
    if final_system:
        messages.append({"role": "system", "content": final_system})
    messages.append({"role": "user", "content": user_prompt})

    text, err = openrouter_post(messages, model=model, max_tokens=max_tokens, temperature=temperature, timeout=timeout)
    if text is not None:
        return {"ok": True, "resposta": text, "provider": "openrouter"}

    print(f"[OpenRouter falhou: {err}] — a tentar modelo alternativo...")

    text2, err2 = openrouter_post(messages, model=OPENROUTER_MODEL_2, max_tokens=max_tokens, temperature=temperature, timeout=timeout)
    if text2 is not None:
        return {"ok": True, "resposta": text2, "provider": "openrouter-2"}

    print(f"[OpenRouter modelo 2 falhou: {err2}] — a tentar Gemini fallback...")

    gen_config = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if json_mode:
        gen_config["responseMimeType"] = "application/json"
    contents = []
    if final_system:
        contents.append({"role": "user", "parts": [{"text": f"[Instruções do sistema]: {final_system}"}]})
    contents.append({"role": "user", "parts": [{"text": user_prompt}]})
    payload = {"contents": contents, "generationConfig": gen_config}
    data = gemini_post(model or GEMINI_MODEL, payload, timeout=timeout)
    if "error" in data:
        return {"ok": False, "erro": f"OpenRouter: {err} | OpenRouter2: {err2} | Gemini: {data['error'].get('message', 'Erro')}"}
    try:
        txt = data['candidates'][0]['content']['parts'][0]['text']
        return {"ok": True, "resposta": txt, "provider": "gemini"}
    except (KeyError, IndexError):
        return {"ok": False, "erro": "Resposta inválida do Gemini"}


# ─── ROUTES ────────────────────────────────────────────────

PROF_CODE = os.environ.get('PROF_CODE', 'professors&o')

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/app')
def main_app():
    return render_template('app.html')


@app.route('/api/verify-prof-code', methods=['POST'])
def verify_prof_code():
    data = request.json or {}
    code = data.get('code', '')
    return jsonify({'valid': code == PROF_CODE and len(PROF_CODE) > 0})


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    q = request.json.get('q', '') if request.is_json else ''
    if not q:
        return jsonify({'erro': 'Sem pergunta'}), 400
    try:
        ctx = {
            'email': (request.json or {}).get('email', ''),
            'ip': request.remote_addr or '',
            'mac': request.headers.get('X-Client-MAC', '')
        }
        forwarded = request.headers.get('X-Forwarded-For', '')
        if forwarded:
            ctx['ip'] = forwarded.split(',')[0].strip()

        result = ai_post(
            user_prompt=f'Sê um assistente educativo prestativo. Responde em português. Se o utilizador pedir código, mostra-o formatado.\n\n{q}',
            max_tokens=2048, temperature=0.7, ai_context=ctx
        )
        if result["ok"]:
            return jsonify({'resposta': result["resposta"]})
        return jsonify({'erro': result["erro"]}), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': f'Erro interno: {str(e)}'}), 500


@app.route('/api/ai/image', methods=['POST'])
def ai_image():
    prompt = request.json.get('prompt', '') if request.is_json else ''
    if not prompt:
        return jsonify({'erro': 'Sem prompt'}), 400
    try:
        data = gemini_post('gemini-3.1-flash-lite-image', {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'responseModalities': ['TEXT', 'IMAGE']}
        }, timeout=60)
        if 'error' in data:
            return jsonify({'erro': data['error'].get('message', 'Erro na API de imagens')}), 500
        parts = data['candidates'][0]['content']['parts']
        for p in parts:
            if 'inlineData' in p:
                return jsonify({
                    'imagem': p['inlineData']['data'],
                    'mime': p['inlineData']['mimeType']
                })
        return jsonify({'erro': 'Sem imagem gerada'}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/ai/corrigir', methods=['POST'])
def ai_corrigir():
    data = request.json if request.is_json else {}
    pergunta = data.get('pergunta', '')
    resposta_aluno = data.get('resposta', '')
    resposta_correta = data.get('correta', '')
    if not pergunta or not resposta_aluno:
        return jsonify({'erro': 'Dados em falta (pergunta e resposta são obrigatórios)'}), 400
    try:
        ctx = {
            'email': data.get('email', ''),
            'ip': request.remote_addr or '',
            'mac': request.headers.get('X-Client-MAC', '')
        }
        forwarded = request.headers.get('X-Forwarded-For', '')
        if forwarded:
            ctx['ip'] = forwarded.split(',')[0].strip()

        prompt = (
            f'Analisa esta resposta de aluno.\n'
            f'Pergunta: {pergunta}\n'
            f'Resposta correta: {resposta_correta or "Não fornecida"}\n'
            f'Resposta do aluno: {resposta_aluno}\n\n'
            f'Dá uma nota de 0 a 20 e uma breve justificação em português.\n'
            f'Responde APENAS em JSON: {{"nota": X, "justificacao": "..."}}'
        )
        result = ai_post(user_prompt=prompt, max_tokens=512, temperature=0.3, json_mode=True, ai_context=ctx)
        if result["ok"]:
            return jsonify({'resultado': result["resposta"]})
        return jsonify({'erro': result["erro"]}), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "S&O+ Ultra Workspace <noreply@soplus.pt>")


@app.route('/api/ai/web-search', methods=['POST'])
def web_search():
    q = request.json.get('q', '') if request.is_json else ''
    if not q:
        return jsonify({'erro': 'Sem pergunta'}), 400

    if HAS_DDG:
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(q, max_results=8):
                    results.append({
                        'title': r.get('title', ''),
                        'body': r.get('body', ''),
                        'href': r.get('href', '')
                    })
            if results:
                return jsonify({'resultados': results})
        except Exception as e:
            print(f"[DDG search erro: {e}]")

    try:
        prompt = (
            f'Pesquisa web: "{q}". Dá 6 resultados fictícios mas realistas.\n'
            f'Responde APENAS em JSON array:\n'
            f'[{{"title":"título","body":"descrição curta","href":"https://example.com/..."}}]'
        )
        result = ai_post(user_prompt=prompt, max_tokens=1024, temperature=0.3)
        if result["ok"]:
            txt = result["resposta"]
            start = txt.find('[')
            end = txt.rfind(']') + 1
            if start != -1 and end > start:
                return jsonify({'resultados': json.loads(txt[start:end])})
        return jsonify({'erro': 'Sem resultados disponíveis'}), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': f'Erro: {str(e)}'}), 500


@app.route('/api/ai/news', methods=['POST'])
def ai_news():
    if HAS_DDG:
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.news('educação Portugal escolas', max_results=6, region='pt-pt'):
                    results.append({
                        'title': r.get('title', ''),
                        'body': r.get('body', ''),
                        'url': r.get('url', ''),
                        'source': r.get('source', ''),
                        'date': r.get('date', '')
                    })
            if results:
                return jsonify({'noticias': results})
        except Exception as e:
            print(f"[DDG news erro: {e}]")

    try:
        prompt = (
            'Dá 6 notícias fictícias mas realistas de educação em Portugal.\n'
            'Responde APENAS em JSON array:\n'
            '[{{"title":"título","body":"resumo 2-3 frases","url":"https://example.com/...","source":"fonte","date":"2026-01-01"}}]'
        )
        result = ai_post(user_prompt=prompt, max_tokens=1024, temperature=0.5)
        if result["ok"]:
            txt = result["resposta"]
            start = txt.find('[')
            end = txt.rfind(']') + 1
            if start != -1 and end > start:
                return jsonify({'noticias': json.loads(txt[start:end])})
        return jsonify({'erro': 'Sem notícias disponíveis'}), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


def _require_admin():
    """Verifica se o utilizador é admin via UID ou API key."""
    admin_key = request.headers.get('X-Admin-Key', '')
    if ADMIN_AI_KEY and admin_key == ADMIN_AI_KEY:
        return None
    uid = request.headers.get('X-User-UID', '')
    if not uid:
        return jsonify({'erro': 'Acesso negado'}), 401
    try:
        user_data = _fb_get(f'users/{uid}')
        if not user_data or user_data.get('role') != 'admin':
            return jsonify({'erro': 'Acesso negado'}), 403
    except Exception:
        return jsonify({'erro': 'Erro ao verificar admin'}), 500
    return None


@app.route('/api/admin/send-email', methods=['POST'])
def send_email():
    admin_err = _require_admin()
    if admin_err: return admin_err
    data = request.json if request.is_json else {}
    to = data.get('to', '')
    subject = data.get('subject', '')
    body = data.get('body', '')
    if not to or not subject or not body:
        return jsonify({'erro': 'Campos em falta'}), 400
    if not SMTP_USER or not SMTP_PASS:
        return jsonify({'erro': 'SMTP não configurado no servidor'}), 503
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['From'] = SMTP_FROM
        msg['To'] = to
        msg['Subject'] = subject
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        return jsonify({'ok': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/ai-query', methods=['POST'])
def admin_ai_query():
    admin_err = _require_admin()
    if admin_err: return admin_err
    prompt = request.json.get('prompt', '') if request.is_json else ''
    if not prompt:
        return jsonify({'erro': 'Sem prompt'}), 400
    try:
        result = ai_post(user_prompt=prompt, max_tokens=2048, temperature=0.3)
        if result["ok"]:
            return jsonify({'resposta': result["resposta"]})
        return jsonify({'erro': result["erro"]}), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ─── MOODLE PROXY ─────────────────────────────────────────

try:
    from moodle import MoodleBridge, _DEV_KEY
    HAS_MOODLE = True
except ImportError:
    HAS_MOODLE = False
    _DEV_KEY = ""

def _get_moodle(auth=""):
    if not HAS_MOODLE:
        return None
    return MoodleBridge(authorization=auth)

def _moodle_check(auth=""):
    m = _get_moodle(auth)
    if not m:
        return None, ({'erro': 'moodle.py não encontrado. Coloca o ficheiro na pasta da app.'}, 404)
    return m, None

@app.route('/api/moodle/test', methods=['POST'])
def moodle_test():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    return jsonify(m.status())

@app.route('/api/moodle/courses', methods=['POST'])
def moodle_courses():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.cursos(d.get('userid')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/grades', methods=['POST'])
def moodle_grades():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.notas(d.get('courseid'), d.get('userid')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/grades/push', methods=['POST'])
def moodle_push_grade():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.registar_nota(d['userid'], d['itemid'], d['grade'], d.get('feedback', '')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/assignments', methods=['POST'])
def moodle_assignments():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.testes(d.get('courseids')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/assignments/submit', methods=['POST'])
def moodle_submit_assign():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.submeter_teste(d['assignid'], d['userid'], d.get('plugindata')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/assignments/create', methods=['POST'])
def moodle_create_assign():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.criar_teste(d['courseid'], d['name'], d.get('description', ''), d.get('duedate', 0), d.get('grade', 100)))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/schedule', methods=['POST'])
def moodle_schedule():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.horario(d['courseid']))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/events', methods=['POST'])
def moodle_events():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.eventos(d.get('courseids')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/users', methods=['POST'])
def moodle_users():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.utilizadores(d['userids']))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/quiz/create', methods=['POST'])
def moodle_create_quiz():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.criar_quiz(d['courseid'], d['name'], d.get('description', ''), d.get('timeopen', 0), d.get('timeclose', 0), d.get('grade', 100)))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/course/create', methods=['POST'])
def moodle_create_course():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.criar_curso(d['fullname'], d['shortname'], d.get('categoryid', 0)))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/course/update', methods=['POST'])
def moodle_update_course():
    d = request.json or {}
    m, err = _moodle_check(d.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.atualizar_curso(d['courseid'], d.get('fullname'), d.get('shortname')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403


@app.route('/api/admin/gift', methods=['POST'])
def admin_gift():
    """Admin presenteia um utilizador com uma extensão + mensagem opcional + imagem opcional."""
    admin_err = _require_admin()
    if admin_err: return admin_err
    data = request.json if request.is_json else {}
    userId = data.get('userId', '')
    extId = data.get('extId', '')
    message = data.get('message', '')
    image = data.get('image', '')

    if not userId or not extId:
        return jsonify({'erro': 'Utilizador e extensão são obrigatórios'}), 400

    try:
        import time
        giftId = f"gift_{int(time.time()*1000)}"

        giftData = {
            'userId': userId,
            'extId': extId,
            'message': message,
            'image': image,
            'status': 'pending',
            'createdAt': int(time.time() * 1000)
        }

        _fb_put(f'admin_gifts/{giftId}', giftData)
        _fb_put(f'user_extensions/{userId}/{extId}', True)

        return jsonify({'ok': True, 'giftId': giftId})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/gifts', methods=['POST'])
def get_gifts():
    """Lista presentes pendentes de um utilizador."""
    data = request.json if request.is_json else {}
    userId = data.get('userId', '')
    if not userId:
        return jsonify({'erro': 'userId obrigatório'}), 400

    try:
        all_gifts = _fb_get('admin_gifts') or {}
        user_gifts = [
            {**v, 'id': k}
            for k, v in all_gifts.items()
            if v.get('userId') == userId and v.get('status') == 'pending'
        ]
        return jsonify({'gifts': user_gifts})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/gifts/claim', methods=['POST'])
def claim_gift():
    """Marca um presente como recebido."""
    data = request.json if request.is_json else {}
    giftId = data.get('giftId', '')
    if not giftId:
        return jsonify({'erro': 'giftId obrigatório'}), 400

    try:
        _fb_put(f'admin_gifts/{giftId}/status', 'delivered')
        return jsonify({'ok': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


def _fb_put(path, value):
    """Escrita direta no Firebase RTDB via HTTP."""
    import urllib.request
    url = f"https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app/{path}.json"
    req = urllib.request.Request(url, data=json.dumps(value).encode(), method='PUT')
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=10) as resp:
        return json.loads(resp.read())


def _fb_get(path):
    """Leitura direta no Firebase RTDB via HTTP."""
    import urllib.request
    url = f"https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app/{path}.json"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=10) as resp:
        return json.loads(resp.read())


def _fb_delete(path):
    """Eliminação direta no Firebase RTDB via HTTP."""
    import urllib.request
    url = f"https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app/{path}.json"
    req = urllib.request.Request(url, method='DELETE')
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=10) as resp:
        return json.loads(resp.read())


# ═══════════════════════════════════════════════════════════════
#   AI RULES — Personalização de respostas IA
# ═══════════════════════════════════════════════════════════════

def resolve_ai_rules(email="", ip="", mac="", user_ids=None):
    """
    Procura regras de personalização IA que apliquem ao utilizador.
    Prioridade: email > ip/mac > grupo
    Retorna dict com system_prompt, tone, language, restrictions, etc.
    """
    try:
        rules = _fb_get('ai_rules') or {}
    except Exception:
        return {}

    matched = []
    for rule_id, rule in rules.items():
        if not rule.get('active', True):
            continue
        rule_type = rule.get('type', '')
        target = rule.get('target', '').lower().strip()

        if rule_type == 'all':
            matched.append(rule)
        elif rule_type == 'email' and email.lower().strip() == target:
            matched.append(rule)
        elif rule_type == 'ip' and ip.strip() == target:
            matched.append(rule)
        elif rule_type == 'mac' and mac.lower().strip().replace(':', '').replace('-', '') == target.replace(':', '').replace('-', ''):
            matched.append(rule)
        elif rule_type == 'group' and user_ids and target in user_ids:
            matched.append(rule)

    if not matched:
        return {}

    result = {}
    for rule in matched:
        if rule.get('system_prompt'):
            result['system_prompt'] = rule['system_prompt']
        if rule.get('tone'):
            result['tone'] = rule['tone']
        if rule.get('language'):
            result['language'] = rule['language']
        if rule.get('restrictions'):
            result['restrictions'] = rule['restrictions']
        if rule.get('name'):
            result['rule_name'] = rule['name']
    return result


def build_ai_prompt_with_rules(user_prompt, base_system, rules_context):
    """Constrói o system prompt final com as regras personalizadas."""
    parts = [base_system] if base_system else []

    if rules_context.get('system_prompt'):
        parts.append(rules_context['system_prompt'])
    if rules_context.get('tone'):
        parts.append(f"Tom de voz: {rules_context['tone']}")
    if rules_context.get('language'):
        parts.append(f"Idioma de resposta: {rules_context['language']}")
    if rules_context.get('restrictions'):
        parts.append(f"Restrições: {rules_context['restrictions']}")

    return '\n'.join(parts) if parts else None


@app.route('/api/admin/ai-rules', methods=['GET'])
def get_ai_rules():
    """Lista todas as regras de IA."""
    admin_err = _require_admin()
    if admin_err: return admin_err
    try:
        rules = _fb_get('ai_rules') or {}
        return jsonify({'rules': {k: {**v, 'id': k} for k, v in rules.items()}})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/ai-rules', methods=['POST'])
def save_ai_rule():
    """Cria ou atualiza uma regra de IA."""
    admin_err = _require_admin()
    if admin_err: return admin_err
    data = request.json if request.is_json else {}
    rule_id = data.pop('id', '')
    name = data.get('name', '')

    if not name:
        return jsonify({'erro': 'Nome é obrigatório'}), 400

    rule_data = {
        'name': name,
        'type': data.get('type', 'email'),
        'target': data.get('target', ''),
        'active': data.get('active', True),
        'system_prompt': data.get('system_prompt', ''),
        'tone': data.get('tone', ''),
        'language': data.get('language', 'português'),
        'restrictions': data.get('restrictions', ''),
        'description': data.get('description', ''),
        'updatedAt': time.time() * 1000
    }

    try:
        if not rule_id:
            rule_id = f"rule_{int(time.time() * 1000)}"
            rule_data['createdAt'] = rule_data['updatedAt']
        _fb_put(f'ai_rules/{rule_id}', rule_data)
        return jsonify({'ok': True, 'id': rule_id})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/ai-rules/<rule_id>', methods=['DELETE'])
def delete_ai_rule(rule_id):
    """Elimina uma regra de IA."""
    admin_err = _require_admin()
    if admin_err: return admin_err
    try:
        _fb_delete(f'ai_rules/{rule_id}')
        return jsonify({'ok': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/gh-release', methods=['POST'])
def create_gh_release():
    admin_err = _require_admin()
    if admin_err: return admin_err
    data = request.json or {}
    tag = data.get('tag', '').strip()
    name = data.get('name', '').strip()
    body = data.get('body', '')
    prerelease = data.get('prerelease', False)
    if not tag or not name:
        return jsonify({'erro': 'tag e name obrigatórios'}), 400
    try:
        conn = http.client.HTTPSConnection('api.github.com', timeout=15, context=SSL_CTX)
        payload = json.dumps({
            'tag_name': tag, 'name': name, 'body': body, 'draft': False, 'prerelease': prerelease
        })
        headers = {
            'Authorization': f'token {os.environ.get("GITHUB_TOKEN", "")}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SoplusBot',
            'Content-Type': 'application/json',
            'Content-Length': str(len(payload))
        }
        conn.request('POST', '/repos/franciscoaura93-spec/soplus-workspace/releases', body=payload, headers=headers)
        resp = conn.getresponse()
        result = json.loads(resp.read().decode())
        conn.close()
        if resp.status in (200, 201):
            return jsonify({'ok': True, 'url': result.get('html_url', '')})
        else:
            return jsonify({'erro': result.get('message', f'HTTP {resp.status}')}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/ai/resolve-rules', methods=['POST'])
def resolve_rules_endpoint():
    """Resolve regras de IA para um utilizador (usado pelo frontend)."""
    data = request.json if request.is_json else {}
    email = data.get('email', '')
    ip = data.get('ip', '')
    mac = data.get('mac', '')

    try:
        user_groups = data.get('groups', [])
        rules = resolve_ai_rules(email=email, ip=ip, mac=mac, user_ids=user_groups)
        return jsonify({'rules': rules})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'rules': {}})


@app.route('/api/ai/detect-device', methods=['POST'])
def detect_device():
    """Deteta IP e MAC do utilizador a partir do request."""
    ip = request.remote_addr or ''
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        ip = forwarded.split(',')[0].strip()
    mac = request.headers.get('X-Client-MAC', '')
    return jsonify({'ip': ip, 'mac': mac})


# ─── FACE RECOGNITION ───────────────────────────────────────

@app.route('/api/face/save', methods=['POST'])
def face_save():
    data = request.json or {}
    uid = data.get('uid', '')
    descriptor = data.get('descriptor', [])
    name = data.get('name', '')
    if not uid or not descriptor:
        return jsonify({'erro': 'uid e descriptor obrigatórios'}), 400
    _fb_put(f'face_data/{uid}', {
        'descriptor': descriptor,
        'name': name,
        'createdAt': _fb_get(f'face_data/{uid}/createdAt') or int(time.time() * 1000),
        'updatedAt': int(time.time() * 1000)
    })
    return jsonify({'ok': True})


@app.route('/api/face/status', methods=['GET'])
def face_status():
    uid = request.args.get('uid', '')
    face_data = _fb_get(f'face_data/{uid}')
    owner_data = _fb_get('face_owner')
    if not face_data:
        return jsonify({'registered': False, 'verification_required': bool(owner_data and owner_data.get('verification_enabled'))})
    return jsonify({'registered': True, 'verification_required': bool(owner_data and owner_data.get('verification_enabled'))})


@app.route('/api/face/owner', methods=['POST'])
def face_owner():
    data = request.json or {}
    _fb_put('face_owner', {
        'name': data.get('name', ''),
        'uid': data.get('uid', ''),
        'verification_enabled': data.get('verification_enabled', False),
        'updatedAt': int(time.time() * 1000)
    })
    return jsonify({'ok': True})


@app.route('/api/face/owner', methods=['GET'])
def face_owner_get():
    owner = _fb_get('face_owner') or {}
    return jsonify(owner)


@app.route('/api/face/verify', methods=['POST'])
def face_verify():
    data = request.json or {}
    uid = data.get('uid', '')
    descriptor = data.get('descriptor', [])
    if not uid or not descriptor:
        return jsonify({'erro': 'uid e descriptor obrigatórios'}), 400
    stored = _fb_get(f'face_data/{uid}')
    if not stored or not stored.get('descriptor'):
        return jsonify({'match': False, 'reason': 'no_face_registered'})
    stored_desc = stored['descriptor']
    if len(stored_desc) != len(descriptor):
        return jsonify({'match': False, 'reason': 'descriptor_mismatch'})
    distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(stored_desc, descriptor)))
    threshold = 0.55
    return jsonify({'match': distance < threshold, 'distance': round(distance, 4), 'threshold': threshold})


@app.route('/api/face/all', methods=['GET'])
def face_all():
    all_data = _fb_get('face_data') or {}
    owner = _fb_get('face_owner') or {}
    result = {}
    for uid, fd in all_data.items():
        result[uid] = {'name': fd.get('name', ''), 'has_face': bool(fd.get('descriptor'))}
    return jsonify({'faces': result, 'owner': owner})


# ════════════════════════════════════════════════════════════
#   PROXY — Server-side page fetch for privacy mode
# ════════════════════════════════════════════════════════════
import re as _re, urllib.parse as _urlparse

_BLOCKED_DOMAINS = [
    'doubleclick.net','googlesyndication.com','googleadservices.com',
    'adnxs.com','adsrvr.org','facebook.net','analytics.google.com',
    'googletagmanager.com','ads.','advert.','tracking.','pixel.'
]

@app.route('/api/proxy', methods=['GET'])
def proxy_fetch():
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'No URL'}), 400
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'Invalid URL'}), 400
    parsed = _urlparse.urlparse(url)
    if parsed.hostname in ('localhost', '127.0.0.1', '0.0.0.0'):
        return jsonify({'error': 'Blocked'}), 403
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        }
        r = requests.get(url, headers=headers, timeout=20, allow_redirects=True, verify=False)
        ct = r.headers.get('Content-Type', 'text/html')
        if 'text/html' not in ct:
            return jsonify({'error': 'Not HTML'}), 400
        html = r.text
        base = r.url
        base_parsed = _urlparse.urlparse(base)
        base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
        html = _re.sub(r'<base\s+[^>]*>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<head>', f'<head><base href="{base_origin}/">', html, count=1, flags=_re.IGNORECASE)
        html = _re.sub(r'<script[^>]*>.*?</script>', '', html, flags=_re.IGNORECASE|_re.DOTALL)
        html = _re.sub(r'xmlns="[^"]*"', '', html)
        html = _re.sub(r'x-frame-options[^"]*"[^"]*"', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'content-security-policy[^"]*"[^"]*"', '', html, flags=_re.IGNORECASE)
        for pattern in _BLOCKED_DOMAINS:
            pat = r'<[^>]*(?:src|href|action)=["\x27][^"\x27]*?' + _re.escape(pattern) + r'[^"\x27]*["\x27][^>]*>'
            html = _re.sub(pat, '', html, flags=_re.IGNORECASE)
        html = html.replace("window.open", "void(0)")
        html = html.replace("window.location.href", "void(0)")
        html = html.replace("window.location.replace", "void(0)")
        return html, 200, {'Content-Type': 'text/html; charset=utf-8', 'X-Proxy': 'soplus', 'Access-Control-Allow-Origin': '*'}
    except Exception as e:
        return jsonify({'error': str(e)[:120]}), 502


# ════════════════════════════════════════════════════════════
#   BROWSE — Playwright-powered real browser rendering
# ════════════════════════════════════════════════════════════
_pw_browser = None
_pw_instance = None
_pw_page = None  # Reusable page for speed

def _get_pw_browser():
    global _pw_browser, _pw_instance
    if _pw_browser is None or not _pw_browser.is_connected():
        from playwright.sync_api import sync_playwright
        _pw_instance = sync_playwright().start()
        _pw_browser = _pw_instance.chromium.launch(
            headless=True,
            args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
                  '--disable-background-networking','--disable-default-apps',
                  '--disable-sync','--disable-translate','--metrics-recording-only',
                  '--no-first-run','--disable-blink-features=AutomationControlled',
                  '--disk-cache-size=52428800','--media-cache-size=52428800']
        )
    return _pw_browser

def _get_pw_page():
    """Reuse same page + context = persistent cache, DNS cache, cookies."""
    global _pw_page, _pw_browser
    browser = _get_pw_browser()
    if _pw_page is None or _pw_page.is_closed():
        ctx = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
            java_script_enabled=True
        )
        # Block ads/trackers once at context level
        def _route_handler(route):
            req_host = _urlparse.urlparse(route.request.url).hostname or ''
            if any(d in req_host for d in AD_DOMAINS):
                return route.abort()
            return route.continue_()
        ctx.route('**/*', _route_handler)
        _pw_page = ctx.new_page()
    return _pw_page

AD_DOMAINS = {'doubleclick.net','googlesyndication.com','googleadservices.com','adnxs.com',
    'adsrvr.org','facebook.net','google-analytics.com','googletagmanager.com',
    'ads.google.com','pagead2.googlesyndication.com','tpc.googlesyndication.com'}

@app.route('/api/browse', methods=['GET'])
def browse_page():
    url = request.args.get('url', '').strip()
    mode = request.args.get('mode', 'auto').strip()
    if not url:
        return jsonify({'error': 'No URL'}), 400
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'Invalid URL'}), 400
    parsed = _urlparse.urlparse(url)
    if parsed.hostname in ('localhost', '127.0.0.1', '0.0.0.0'):
        return jsonify({'error': 'Blocked'}), 403

    hostname = (parsed.hostname or '').replace('www.','')

    if mode == 'lite':
        return _browse_lite(url)

    # Auto: simple text sites → lite, everything else → playwright
    text_sites = {'wikipedia.org','britannica.com','mdn.io','developer.mozilla.org',
        'stackoverflow.com','github.com','docs.python.org','docs.microsoft.com',
        'medium.com','substack.com','arxiv.org','khanacademy.org','wolframalpha.com',
        'dictionary.com','merriam-webster.com','geeksforgeeks.org','w3schools.com',
        'tutorialspoint.com','reddit.com','quora.com'}
    if mode == 'auto' and any(hostname.endswith(s) for s in text_sites):
        return _browse_lite(url)

    # ── Playwright: full JS render with video/image support ──
    try:
        page = _get_pw_page()
        try:
            page.goto(url, wait_until='commit', timeout=20000)
            try:
                page.wait_for_load_state('domcontentloaded', timeout=10000)
            except:
                pass
            try:
                page.wait_for_load_state('networkidle', timeout=8000)
            except:
                pass

            # Remove only ads/overlays/popups — keep videos, images, iframes
            page.evaluate("""() => {
                // Remove ad elements
                document.querySelectorAll('[class*="ad-"],[class*="ads-"],[id*="ad-"],[id*="ads-"],[class*="advert"],[data-ad]').forEach(e => e.remove());
                // Remove cookie/consent banners
                document.querySelectorAll('[class*="cookie"],[class*="consent"],[id*="cookie"],[id*="consent"],[class*="gdpr"]').forEach(e => e.remove());
                // Remove fixed overlays (but keep nav/header)
                document.querySelectorAll('[style*="position: fixed"],[style*="position:fixed"]').forEach(e => {
                    const tag = e.tagName;
                    if (tag !== 'NAV' && tag !== 'HEADER' && !e.querySelector('video,iframe')) e.remove();
                });
                // Remove social share popups
                document.querySelectorAll('[class*="share-popup"],[class*="social-modal"],[class*="newsletter-popup"]').forEach(e => e.remove());
            }""")

            html = page.content()
            final_url = page.url
            base_parsed = _urlparse.urlparse(final_url)
            base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
            html = _re.sub(r'<base\s+[^>]*>', '', html, flags=_re.IGNORECASE)
            html = f'<base href="{base_origin}/">' + html
            title = page.title() or _br_extract_title(html)
            return jsonify({'html': html, 'title': title, 'url': final_url, 'mode': 'playwright'})
        except Exception as page_err:
            # Reset page on error so next request gets a fresh one
            global _pw_page
            try:
                if _pw_page and not _pw_page.is_closed():
                    _pw_page.close()
            except:
                pass
            _pw_page = None
            raise page_err
    except Exception as e:
        print(f"[Playwright falhou para {url}: {e}] — fallback lite")
        return _browse_lite(url)


def _browse_lite(url):
    """Fetch rápido — sem JS, só HTML. Para sites de texto/artigos."""
    try:
        req = _urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
        })
        with _urllib.request.urlopen(req, context=SSL_CTX, timeout=12) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'text/html' not in ct:
                return jsonify({'error': 'Não é HTML', 'url': url}), 400
            raw = resp.read(2_000_000).decode('utf-8', errors='replace')
            final_url = resp.url
        # Clean: remove scripts, keep images/videos/styles
        raw = _re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=_re.IGNORECASE|_re.DOTALL)
        raw = _re.sub(r'<!--.*?-->', '', raw, flags=_re.DOTALL)
        raw = _re.sub(r'<(iframe|video|audio|object|embed|noscript)[^>]*>.*?</\1>', '', raw, flags=_re.IGNORECASE|_re.DOTALL)
        base_parsed = _urlparse.urlparse(final_url)
        base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
        raw = _re.sub(r'<base\s+[^>]*>', '', raw, flags=_re.IGNORECASE)
        raw = f'<base href="{base_origin}/"><style>body{{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.7;color:#1a1a1a;background:#fff;img{{max-width:100%}}}}</style>' + raw
        title_m = _re.search(r'<title[^>]*>(.*?)</title>', raw, _re.IGNORECASE|_re.DOTALL)
        title = title_m.group(1).strip() if title_m else _br_extract_title(raw)
        return jsonify({'html': raw, 'title': title, 'url': final_url, 'mode': 'lite'})
    except Exception as e:
        return jsonify({'error': str(e)[:200], 'url': url}), 502

def _br_extract_title(html):
    m = _re.search(r'<title[^>]*>(.*?)</title>', html, _re.IGNORECASE|_re.DOTALL)
    return m.group(1).strip() if m else 'Sem título'


# ─── BROWSER API ───────────────────────────────────────────
import http.cookiejar as _cookiejar

_browser_bookmarks = []
_browser_history = []

@app.route('/browser')
def browser_page():
    return render_template('browser.html')

@app.route('/api/browser/bookmarks', methods=['GET'])
def browser_get_bookmarks():
    return jsonify(_browser_bookmarks)

@app.route('/api/browser/bookmarks', methods=['POST'])
def browser_add_bookmark():
    d = request.json or {}
    url, name = d.get('url',''), d.get('name','')
    if url and not any(b['url']==url for b in _browser_bookmarks):
        _browser_bookmarks.append({'url':url,'name':name or url})
    return jsonify({'ok':True})

@app.route('/api/browser/bookmarks', methods=['DELETE'])
def browser_del_bookmark():
    d = request.json or {}
    url = d.get('url','')
    global _browser_bookmarks
    _browser_bookmarks = [b for b in _browser_bookmarks if b['url']!=url]
    return jsonify({'ok':True})

@app.route('/api/browser/history', methods=['GET'])
def browser_get_history():
    return jsonify(_browser_history[:30])

@app.route('/api/browser/history', methods=['POST'])
def browser_add_history():
    d = request.json or {}
    url, title = d.get('url',''), d.get('title','')
    _browser_history.insert(0, {'url':url,'title':title or url})
    del _browser_history[31:]
    return jsonify({'ok':True})


if __name__ == '__main__':
    import webbrowser, threading
    threading.Timer(1.5, lambda: webbrowser.open('http://localhost:5000')).start()
    app.run(debug=False, host='0.0.0.0', port=5000)
