// S&O+ Extension: Ferramentas
function renderFerramentas(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
            <div class="card">
                <div style="font-size:32px;margin-bottom:8px;">⏱️</div>
                <h3 style="font-size:16px;margin-bottom:12px;">Timer</h3>
                <div id="timer-display" style="font-size:36px;font-weight:700;text-align:center;font-family:monospace;color:var(--accent);margin-bottom:12px;">00:00:00</div>
                <div style="display:flex;gap:8px;">
                    <input type="number" class="form-input" id="timer-min" placeholder="Min" value="5" style="width:70px;text-align:center;">
                    <button class="btn btn-primary" onclick="timerStart()">▶ Iniciar</button>
                    <button class="btn btn-outline" onclick="timerStop()">⏹ Parar</button>
                    <button class="btn btn-outline" onclick="timerReset()">↺ Reset</button>
                </div>
            </div>
            <div class="card">
                <div style="font-size:32px;margin-bottom:8px;">🔐</div>
                <h3 style="font-size:16px;margin-bottom:12px;">Gerador de Senhas</h3>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <input type="number" class="form-input" id="pass-len" value="16" min="4" max="64" style="width:70px;text-align:center;">
                    <button class="btn btn-primary" onclick="genPassword()">Gerar</button>
                </div>
                <div id="pass-result" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:monospace;font-size:14px;word-break:break-all;min-height:44px;cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent);showToast('Copiado!')"></div>
                <p style="font-size:11px;color:var(--text-light);margin-top:6px;">Clica para copiar</p>
            </div>
            <div class="card">
                <div style="font-size:32px;margin-bottom:8px;">🔢</div>
                <h3 style="font-size:16px;margin-bottom:12px;">Calculadora de Notas</h3>
                <div id="grade-calc">
                    <div style="font-size:12px;color:var(--text-light);margin-bottom:8px;">Adiciona as tuas notas (0-20):</div>
                    <div id="grade-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;"></div>
                    <div style="display:flex;gap:8px;">
                        <input type="number" class="form-input" id="grade-input" placeholder="Nota" min="0" max="20" style="width:80px;" onkeydown="if(event.key==='Enter')addGrade()">
                        <button class="btn btn-outline" onclick="addGrade()">+ Adicionar</button>
                    </div>
                    <div id="grade-result" style="margin-top:12px;font-size:14px;"></div>
                </div>
            </div>
            <div class="card">
                <div style="font-size:32px;margin-bottom:8px;">📅</div>
                <h3 style="font-size:16px;margin-bottom:12px;">Data e Hora</h3>
                <div id="datetime-display" style="font-size:14px;color:var(--text-light);line-height:2;"></div>
                <button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="navigator.clipboard.writeText(new Date().toLocaleString('pt-PT'));showToast('Data copiada!')">📋 Copiar Data</button>
            </div>
        </div>
    `;
    window._grades = [];
    updateDateTime();
    window._dtInterval = setInterval(updateDateTime, 1000);
}

function updateDateTime() {
    const el = document.getElementById('datetime-display');
    if (!el) { clearInterval(window._dtInterval); return; }
    const now = new Date();
    el.innerHTML = `
        <div>📆 ${now.toLocaleDateString('pt-PT', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</div>
        <div>🕐 ${now.toLocaleTimeString('pt-PT')}</div>
        <div>📊 Semana ${Math.ceil(((now - new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay()+1) / 7)}</div>
    `;
}

let _timerInterval = null;
let _timerSeconds = 0;
function timerStart() {
    if (_timerInterval) return;
    const min = parseInt(document.getElementById('timer-min').value) || 5;
    if (_timerSeconds === 0) _timerSeconds = min * 60;
    _timerInterval = setInterval(() => {
        _timerSeconds--;
        const h = String(Math.floor(_timerSeconds/3600)).padStart(2,'0');
        const m = String(Math.floor((_timerSeconds%3600)/60)).padStart(2,'0');
        const s = String(_timerSeconds%60).padStart(2,'0');
        const display = document.getElementById('timer-display');
        if (display) display.textContent = `${h}:${m}:${s}`;
        if (_timerSeconds <= 0) { timerStop(); showToast('⏰ Tempo esgotado!'); }
    }, 1000);
}
function timerStop() { clearInterval(_timerInterval); _timerInterval = null; }
function timerReset() { timerStop(); _timerSeconds = 0; const d = document.getElementById('timer-display'); if(d) d.textContent = '00:00:00'; }

function genPassword() {
    const len = parseInt(document.getElementById('pass-len').value) || 16;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+-=';
    const pass = Array.from({length:len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    document.getElementById('pass-result').textContent = pass;
}

function addGrade() {
    const input = document.getElementById('grade-input');
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0 || val > 20) return;
    window._grades.push(val);
    input.value = '';
    renderGradeList();
}
function removeGrade(i) {
    window._grades.splice(i, 1);
    renderGradeList();
}
function renderGradeList() {
    const list = document.getElementById('grade-list');
    const result = document.getElementById('grade-result');
    if (!list) return;
    list.innerHTML = window._grades.map((g, i) => `<div style="display:flex;align-items:center;gap:8px;font-size:13px;"><span style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px 10px;">${g}</span><span style="color:${g >= 10 ? 'var(--success)' : 'var(--danger)'};font-weight:600;">${g >= 10 ? '✅' : '❌'}</span><button onclick="removeGrade(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;">✕</button></div>`).join('');
    if (window._grades.length > 0) {
        const avg = window._grades.reduce((a,b)=>a+b,0) / window._grades.length;
        const emoji = avg >= 16 ? '🎉' : avg >= 10 ? '✅' : '❌';
        result.innerHTML = `<div style="padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">Média: <strong style="font-size:18px;color:${avg >= 10 ? 'var(--success)' : 'var(--danger)'};">${avg.toFixed(2)}</strong> / 20 ${emoji}</div>`;
    } else {
        result.innerHTML = '';
    }
}
