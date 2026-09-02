// S&O+ Extension: Estudo IA — Super AI Study Assistant
let _ia = {
  messages: [],
  mediaStream: null,
  videoEl: null,
  recognition: null,
  isListening: false,
  overlayActive: false,
  overlayEl: null,
  tipInterval: null,
  tips: [
    "Tenta usar a regra dos 5 segundos para começar a estudar",
    "Fazer pausas de 5 min a cada 25 min melhora a retenção",
    "Explicar a matéria a alguém é a melhor forma de aprender",
    "Usa flashcards para memorizar conceitos-chave",
    "Dormir bem consolida a memória de longo prazo",
    "Ler em voz alta ajuda a fixar melhor o conteúdo",
    "Fazer resumos manuais ativa mais áreas do cérebro",
    "Alterna entre matérias para manter o foco",
    "Beber água durante o estudo mantém-te alerta",
    "O cérebro aprende melhor com exemplos práticos"
  ]
};

function renderEstudoIa(area) {
  area.innerHTML = `
    <div class="page-header"><h2>🧠 Estudo IA</h2><p>Assistente de estudo inteligente</p></div>
    <div id="estudo-ia-layout" style="display:grid;grid-template-columns:1fr 340px;gap:20px;height:calc(100vh - 200px);">
      <div class="card" style="display:flex;flex-direction:column;margin-bottom:0;padding:0;overflow:hidden;">
        <div id="estudo-ia-messages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;"></div>
        <div id="estudo-ia-typing" style="display:none;padding:12px 20px;border-top:1px solid var(--border);">
          <div class="ai-typing"><span></span><span></span><span></span></div>
        </div>
        <div class="chat-input-wrap">
          <input id="estudo-ia-input" type="text" class="form-input" placeholder="Faz uma pergunta sobre o ecrã..." style="flex:1;border-radius:12px;" onkeydown="if(event.key==='Enter')_iaSend()">
          <button class="btn btn-primary" onclick="_iaSend()">Enviar</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="card" style="padding:18px;margin-bottom:0;">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;">🖥️ Captura de Ecrã</div>
          <div id="estudo-ia-preview" style="width:100%;aspect-ratio:16/9;background:var(--bg);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-light);margin-bottom:12px;">Preview</div>
          <button class="btn btn-ai btn-sm" onclick="_iaCapture()" style="width:100%;">📷 Capturar Ecrã</button>
        </div>
        <div class="card" style="padding:18px;margin-bottom:0;">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;">🎤 Voz</div>
          <div id="estudo-ia-waveform" style="display:none;height:40px;background:var(--bg);border-radius:8px;margin-bottom:10px;overflow:hidden;position:relative;">
            <canvas id="estudo-ia-wave-canvas" style="width:100%;height:100%;"></canvas>
          </div>
          <div id="estudo-ia-transcript" style="font-size:12px;color:var(--text-light);min-height:30px;margin-bottom:10px;padding:8px;background:var(--bg);border-radius:8px;word-wrap:break-word;"></div>
          <button id="estudo-ia-listen-btn" class="btn btn-outline btn-sm" onclick="_iaToggleVoice()" style="width:100%;">🎤 Ouvir</button>
        </div>
        <div class="card" style="padding:18px;margin-bottom:0;">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;">📚 Recomendações</div>
          <button class="btn btn-banana btn-sm" onclick="_iaRecommendBooks()" style="width:100%;">📚 Recomendar Livros</button>
          <div id="estudo-ia-books" style="margin-top:12px;font-size:13px;line-height:1.6;max-height:200px;overflow-y:auto;"></div>
        </div>
      </div>
    </div>
    <div id="estudo-ia-overlay"></div>`;
  _iaAddMessage('ai', 'Olá! Sou o teu assistente de estudo inteligente. Captura o ecrã ou pergunta-me qualquer coisa. 📚✨');
  _iaInitOverlay();
}

function _iaAddMessage(role, text) {
  const el = document.getElementById('estudo-ia-messages');
  if (!el) return;
  _ia.messages.push({ role, text, time: Date.now() });
  const div = document.createElement('div');
  div.className = role === 'ai' ? 'ai-msg' : 'ai-msg-user';
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function _iaSetTyping(show) {
  const el = document.getElementById('estudo-ia-typing');
  if (el) el.style.display = show ? 'flex' : 'none';
}

async function _iaSend() {
  const input = document.getElementById('estudo-ia-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  _iaAddMessage('user', text);
  _iaSetTyping(true);
  try {
    let context = '';
    const preview = document.getElementById('estudo-ia-preview');
    const img = preview && preview.querySelector('img');
    if (img) context = '\n[Imagem do ecrã disponível para análise]';
    const answer = await callAI(`[Assistente de Estudo IA]\n${text}${context}`);
    _iaAddMessage('ai', answer);
  } catch (e) {
    _iaAddMessage('ai', 'Desculpa, houve um erro: ' + e.message);
  } finally {
    _iaSetTyping(false);
  }
}

async function _iaCapture() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    _ia.mediaStream = stream;
    const video = document.createElement('video');
    _ia.videoEl = video;
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();
    const preview = document.getElementById('estudo-ia-preview');
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    preview.appendChild(img);
    const captureFrame = () => {
      if (!_ia.mediaStream) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
      img.src = canvas.toDataURL('image/jpeg', 0.6);
    };
    captureFrame();
    setInterval(captureFrame, 3000);
    stream.getVideoTracks()[0].onended = () => {
      _ia.mediaStream = null;
      _ia.videoEl = null;
      preview.innerHTML = '<span style="font-size:12px;color:var(--text-light);">Preview</span>';
    };
    showToast('🖥️ Ecrã a ser capturado!', 'success');
  } catch (e) {
    if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
      showToast('Erro ao capturar ecrã: ' + e.message, 'error');
    }
  }
}

function _iaToggleVoice() {
  const btn = document.getElementById('estudo-ia-listen-btn');
  if (_ia.isListening) {
    _iaStopVoice();
    btn.textContent = '🎤 Ouvir';
    btn.className = 'btn btn-outline btn-sm';
    document.getElementById('estudo-ia-waveform').style.display = 'none';
  } else {
    _iaStartVoice();
    btn.textContent = '⏹️ Parar';
    btn.className = 'btn btn-danger btn-sm';
    document.getElementById('estudo-ia-waveform').style.display = 'block';
  }
}

function _iaStartVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Reconhecimento de voz não suportado neste browser', 'error');
    return;
  }
  _ia.isListening = true;
  _ia.recognition = new SpeechRecognition();
  _ia.recognition.continuous = true;
  _ia.recognition.interimResults = true;
  _ia.recognition.lang = 'pt-PT';
  const transcriptEl = document.getElementById('estudo-ia-transcript');
  const canvas = document.getElementById('estudo-ia-wave-canvas');
  const ctx = canvas.getContext('2d');
  let animationId = null;
  const drawWave = () => {
    if (!_ia.isListening) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    const bars = 40;
    for (let i = 0; i < bars; i++) {
      const amp = Math.random() * h * 0.6 + h * 0.1;
      ctx.fillStyle = `rgba(139,92,246,${0.3 + Math.random() * 0.5})`;
      ctx.fillRect(i * (w / bars), h / 2 - amp / 2, w / bars - 2, amp);
    }
    animationId = requestAnimationFrame(drawWave);
  };
  drawWave();
  _ia.recognition.onresult = (e) => {
    let final = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    transcriptEl.textContent = final || interim || '…';
    if (final) {
      _iaAddMessage('user', final);
      transcriptEl.textContent = '';
      _iaSetTyping(true);
      callAI('[Assistente de Estudo IA - Comando de Voz]\n' + final)
        .then(answer => { _iaAddMessage('ai', answer); _iaSetTyping(false); })
        .catch(e => { _iaAddMessage('ai', 'Erro: ' + e.message); _iaSetTyping(false); });
    }
  };
  _ia.recognition.onerror = () => {
    if (_ia.isListening) showToast('Erro no reconhecimento de voz', 'error');
  };
  _ia.recognition.start();
}

function _iaStopVoice() {
  _ia.isListening = false;
  if (_ia.recognition) {
    try { _ia.recognition.stop(); } catch (e) {}
    _ia.recognition = null;
  }
  const canvas = document.getElementById('estudo-ia-wave-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

async function _iaRecommendBooks() {
  const el = document.getElementById('estudo-ia-books');
  el.innerHTML = '<div class="spinner" style="margin:0 auto;"></div>';
  try {
    const answer = await callAI('Recomenda 5 livros incríveis para estudar melhor, aprender mais rápido e ter sucesso académico. Para cada livro dá: título, autor, e uma frase porquê é útil. Responde em Português com emojis. Formata como lista.');
    el.innerHTML = answer;
  } catch (e) {
    el.innerHTML = '<span style="color:var(--danger);font-size:13px;">Erro: ' + e.message + '</span>';
  }
}

function _iaInitOverlay() {
  const container = document.getElementById('estudo-ia-overlay');
  const overlay = document.createElement('div');
  overlay.id = 'ia-floating-overlay';
  overlay.innerHTML = `<div id="ia-overlay-icon">✨</div><div id="ia-overlay-tip"></div>`;
  container.appendChild(overlay);
  _ia.overlayEl = overlay;
  let isDragging = false, startX, startY, origX, origY;
  overlay.style.cssText = 'position:fixed;bottom:100px;right:30px;z-index:999;cursor:grab;display:flex;align-items:center;gap:12px;background:var(--surface-solid);border:1px solid var(--ai);border-radius:50px;padding:8px 16px 8px 8px;box-shadow:0 0 30px rgba(139,92,246,0.3),0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(12px);transition:box-shadow 0.3s,transform 0.2s;animation:springIn 0.6s cubic-bezier(.34,1.56,.64,1);';
  overlay.onmouseenter = () => overlay.style.boxShadow = '0 0 50px rgba(139,92,246,0.5),0 8px 32px rgba(0,0,0,0.4)';
  overlay.onmouseleave = () => overlay.style.boxShadow = '0 0 30px rgba(139,92,246,0.3),0 8px 32px rgba(0,0,0,0.4)';
  overlay.onmousedown = (e) => {
    isDragging = true; startX = e.clientX; startY = e.clientY;
    const rect = overlay.getBoundingClientRect();
    origX = rect.left; origY = rect.top;
    overlay.style.cursor = 'grabbing';
  };
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    overlay.style.left = (origX + dx) + 'px';
    overlay.style.top = (origY + dy) + 'px';
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false; overlay.style.cursor = 'grab';
  });
  overlay.querySelector('#ia-overlay-icon').style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--gradient-flow);background-size:300% 300%;animation:gradientFlow 4s ease infinite;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 20px rgba(139,92,246,0.4);flex-shrink:0;';
  overlay.querySelector('#ia-overlay-tip').style.cssText = 'font-size:12px;color:var(--text);max-width:200px;line-height:1.4;';
  _iaShowTip();
  _ia.tipInterval = setInterval(_iaShowTip, 15000);
}

function _iaShowTip() {
  const tipEl = document.querySelector('#ia-overlay-tip');
  if (!tipEl) return;
  const tip = _ia.tips[Math.floor(Math.random() * _ia.tips.length)];
  tipEl.textContent = '💡 ' + tip;
  tipEl.style.animation = 'none';
  void tipEl.offsetWidth;
  tipEl.style.animation = 'fadeInUp 0.4s cubic-bezier(.16,1,.3,1)';
}
