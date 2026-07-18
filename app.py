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
import urllib.parse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
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
GEMINI_MODEL = "gemini-3.1-flash-lite"
API_URL = "https://generativelanguage.googleapis.com/v1beta"
HEADERS = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY}


def gemini_post(model, payload, timeout=30):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    body = json.dumps(payload)
    conn = http.client.HTTPSConnection('generativelanguage.googleapis.com', timeout=timeout, context=ctx)
    conn.request('POST', f'/v1beta/models/{model}:generateContent',
                 body=body, headers=HEADERS)
    resp = conn.getresponse()
    data = resp.read().decode()
    conn.close()
    return json.loads(data)

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/app')
def main_app():
    return render_template('app.html')

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    q = request.json.get('q', '')
    if not q:
        return jsonify({'erro': 'Sem pergunta'}), 400
    try:
        data = gemini_post(GEMINI_MODEL, {
            'contents': [{'parts': [{'text': f'Sê um assistente educativo prestativo. Responde em português. Se o utilizador pedir código, mostra-o formatado. {q}'}]}],
            'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 2048}
        })
        if 'error' in data:
            err = data['error']
            if err.get('code') == 429:
                return jsonify({'erro': '⚠️ Quota excedida. Tenta novamente mais tarde.'})
            return jsonify({'erro': err.get('message', 'Erro na API')})
        txt = data['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'resposta': txt})
    except Exception as e:
        return jsonify({'erro': f'Erro de ligação: {str(e)}'}), 500


@app.route('/api/ai/image', methods=['POST'])
def ai_image():
    prompt = request.json.get('prompt', '')
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
        return jsonify({'erro': str(e)}), 500


@app.route('/api/ai/corrigir', methods=['POST'])
def ai_corrigir():
    data = request.json
    pergunta = data.get('pergunta', '')
    resposta_aluno = data.get('resposta', '')
    resposta_correta = data.get('correta', '')
    try:
        data = gemini_post(GEMINI_MODEL, {
            'contents': [{'parts': [{'text': f'Analisa esta resposta de aluno. Pergunta: {pergunta}. Resposta correta: {resposta_correta}. Resposta do aluno: {resposta_aluno}. Dá uma nota de 0 a 20 e uma breve justificação em português. Responde JSON: {{"nota": X, "justificacao": "..."}}'}]}],
            'generationConfig': {'temperature': 0.3, 'responseMimeType': 'application/json'}
        }, timeout=20)
        if 'error' in data:
            return jsonify({'erro': data['error'].get('message', 'Erro na API')})
        txt = data['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'resultado': txt})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "S&O+ Ultra Workspace <noreply@soplus.pt>")


@app.route('/api/ai/web-search', methods=['POST'])
def web_search():
    q = request.json.get('q', '')
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
            print(f"DuckDuckGo error: {e}")

    try:
        data = gemini_post(GEMINI_MODEL, {
            'contents': [{'parts': [{'text': f'Pesquisa web: "{q}". Dá 6 resultados reais. Formato JSON:\n[{{"title":"título","body":"descrição curta","href":"url"}}]'}]}],
            'generationConfig': {'temperature': 0.3, 'maxOutputTokens': 1024}
        }, timeout=30)
        if 'error' in data:
            return jsonify({'erro': data['error'].get('message', 'Erro')})
        txt = data['candidates'][0]['content']['parts'][0]['text']
        import json as _json
        match = _json.loads(txt[txt.index('['):txt.rindex(']')+1])
        return jsonify({'resultados': match})
    except Exception as e:
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
            print(f"DuckDuckGo news error: {e}")

    try:
        data = gemini_post(GEMINI_MODEL, {
            'contents': [{'parts': [{'text': 'Dá 6 notícias reais de educação em Portugal. Formato JSON:\n[{{"title":"título","body":"resumo 2-3 frases","url":"https://...","source":"fonte","date":"2026-01-01"}}]'}]}],
            'generationConfig': {'temperature': 0.5, 'maxOutputTokens': 1024}
        }, timeout=30)
        if 'error' in data:
            return jsonify({'erro': data['error'].get('message', 'Erro')})
        txt = data['candidates'][0]['content']['parts'][0]['text']
        import json as _json
        match = _json.loads(txt[txt.index('['):txt.rindex(']')+1])
        return jsonify({'noticias': match})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@app.route('/api/admin/send-email', methods=['POST'])
def send_email():
    data = request.json
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
        ctx = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, context=ctx) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

if __name__ == '__main__':
    import webbrowser, threading, time
    threading.Timer(1.5, lambda: webbrowser.open('http://localhost:5000')).start()
    app.run(debug=True, host='0.0.0.0', port=5000)
