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
    data = json.loads(raw)
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
    return json.loads(data)


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

    print(f"[OpenRouter falhou: {err}] — a tentar Gemini fallback...")

    gen_config = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if json_mode:
        gen_config["responseMimeType"] = "application/json"
    payload = {"contents": [{"parts": [{"text": user_prompt}]}], "generationConfig": gen_config}
    data = gemini_post(model or GEMINI_MODEL, payload, timeout=timeout)
    if "error" in data:
        return {"ok": False, "erro": f"OpenRouter: {err} | Gemini: {data['error'].get('message', 'Erro')}"}
    try:
        txt = data['candidates'][0]['content']['parts'][0]['text']
        return {"ok": True, "resposta": txt, "provider": "gemini"}
    except (KeyError, IndexError):
        return {"ok": False, "erro": "Resposta inválida do Gemini"}


# ─── ROUTES ────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/app')
def main_app():
    return render_template('app.html')


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
            return jsonify({'erro': data['error'].get('message', 'Erro na API de imagens')})
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


@app.route('/api/admin/send-email', methods=['POST'])
def send_email():
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
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    return jsonify(m.status())

@app.route('/api/moodle/courses', methods=['POST'])
def moodle_courses():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.cursos(request.json.get('userid')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/grades', methods=['POST'])
def moodle_grades():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.notas(request.json.get('courseid'), request.json.get('userid')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/grades/push', methods=['POST'])
def moodle_push_grade():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.registar_nota(d['userid'], d['itemid'], d['grade'], d.get('feedback', '')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/assignments', methods=['POST'])
def moodle_assignments():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.testes(request.json.get('courseids')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/assignments/submit', methods=['POST'])
def moodle_submit_assign():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.submeter_teste(d['assignid'], d['userid'], d.get('plugindata')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/assignments/create', methods=['POST'])
def moodle_create_assign():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.criar_teste(d['courseid'], d['name'], d.get('description', ''), d.get('duedate', 0), d.get('grade', 100)))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/schedule', methods=['POST'])
def moodle_schedule():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.horario(d['courseid']))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/events', methods=['POST'])
def moodle_events():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    try:
        return jsonify(m.eventos(request.json.get('courseids')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/users', methods=['POST'])
def moodle_users():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.utilizadores(d['userids']))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/quiz/create', methods=['POST'])
def moodle_create_quiz():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.criar_quiz(d['courseid'], d['name'], d.get('description', ''), d.get('timeopen', 0), d.get('timeclose', 0), d.get('grade', 100)))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/course/create', methods=['POST'])
def moodle_create_course():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.criar_curso(d['fullname'], d['shortname'], d.get('categoryid', 0)))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403

@app.route('/api/moodle/course/update', methods=['POST'])
def moodle_update_course():
    m, err = _moodle_check(request.json.get('auth', ''))
    if err: return jsonify(err[0]), err[1]
    d = request.json
    try:
        return jsonify(m.atualizar_curso(d['courseid'], d.get('fullname'), d.get('shortname')))
    except (PermissionError, ValueError) as e:
        return jsonify({'erro': str(e)}), 403


@app.route('/api/admin/gift', methods=['POST'])
def admin_gift():
    """Admin presenteia um utilizador com uma extensão + mensagem opcional + imagem opcional."""
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
    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        return json.loads(resp.read())


def _fb_get(path):
    """Leitura direta no Firebase RTDB via HTTP."""
    import urllib.request
    url = f"https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app/{path}.json"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        return json.loads(resp.read())


def _fb_delete(path):
    """Eliminação direta no Firebase RTDB via HTTP."""
    import urllib.request
    url = f"https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app/{path}.json"
    req = urllib.request.Request(url, method='DELETE')
    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
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

        if rule_type == 'email' and email.lower().strip() == target:
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
    try:
        rules = _fb_get('ai_rules') or {}
        return jsonify({'rules': {k: {**v, 'id': k} for k, v in rules.items()}})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/ai-rules', methods=['POST'])
def save_ai_rule():
    """Cria ou atualiza uma regra de IA."""
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
        'updatedAt': __import__('time').time() * 1000
    }

    try:
        if not rule_id:
            rule_id = f"rule_{int(__import__('time').time() * 1000)}"
            rule_data['createdAt'] = rule_data['updatedAt']
        _fb_put(f'ai_rules/{rule_id}', rule_data)
        return jsonify({'ok': True, 'id': rule_id})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/ai-rules/<rule_id>', methods=['DELETE'])
def delete_ai_rule(rule_id):
    """Elimina uma regra de IA."""
    try:
        _fb_delete(f'ai_rules/{rule_id}')
        return jsonify({'ok': True})
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


if __name__ == '__main__':
    import webbrowser, threading
    threading.Timer(1.5, lambda: webbrowser.open('http://localhost:5000')).start()
    app.run(debug=True, host='0.0.0.0', port=5000)
