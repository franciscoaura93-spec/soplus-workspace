import os
import json
import ssl
import http.client
import urllib.parse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
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

if __name__ == '__main__':
    import webbrowser, threading, time
    threading.Timer(1.5, lambda: webbrowser.open('http://localhost:5000')).start()
    app.run(debug=True, host='0.0.0.0', port=5000)
