// S&O+ Extension: Calculadora
function renderCalculadora(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:700px;">
            <div class="card" style="max-width:400px;">
                <input class="form-input" id="calc-display" readonly style="font-size:28px;text-align:right;margin-bottom:12px;height:60px;" value="0">
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                    <button class="btn" style="background:var(--card);color:var(--accent);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcClear()">C</button>
                    <button class="btn" style="background:var(--card);color:var(--accent);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNeg()">±</button>
                    <button class="btn" style="background:var(--card);color:var(--accent);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcPerc()">%</button>
                    <button class="btn" style="background:var(--primary);color:#fff;padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcOp('÷')">÷</button>

                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('7')">7</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('8')">8</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('9')">9</button>
                    <button class="btn" style="background:var(--primary);color:#fff;padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcOp('×')">×</button>

                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('4')">4</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('5')">5</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('6')">6</button>
                    <button class="btn" style="background:var(--primary);color:#fff;padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcOp('−')">−</button>

                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('1')">1</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('2')">2</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcNum('3')">3</button>
                    <button class="btn" style="background:var(--primary);color:#fff;padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcOp('+')">+</button>

                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;grid-column:span 2;" onclick="calcNum('0')">0</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcDot()">.</button>
                    <button class="btn" style="background:var(--surface);padding:16px;font-size:18px;font-weight:600;border-radius:10px;" onclick="calcBack()">⌫</button>
                </div>
                <button class="btn btn-primary" style="width:100%;margin-top:8px;padding:16px;font-size:18px;border-radius:10px;" onclick="calcEquals()">=</button>
            </div>
            <div class="card">
                <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">🧮 Funções Científicas</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <button class="btn btn-outline" onclick="calcFunc('sin')">sin</button>
                    <button class="btn btn-outline" onclick="calcFunc('cos')">cos</button>
                    <button class="btn btn-outline" onclick="calcFunc('tan')">tan</button>
                    <button class="btn btn-outline" onclick="calcFunc('log')">log</button>
                    <button class="btn btn-outline" onclick="calcFunc('ln')">ln</button>
                    <button class="btn btn-outline" onclick="calcFunc('sqrt')">√</button>
                    <button class="btn btn-outline" onclick="calcFunc('pow2')">x²</button>
                    <button class="btn btn-outline" onclick="calcFunc('pow3')">x³</button>
                    <button class="btn btn-outline" onclick="calcFunc('pi')">π</button>
                    <button class="btn btn-outline" onclick="calcFunc('e')">e</button>
                    <button class="btn btn-outline" onclick="calcFunc('fact')">n!</button>
                    <button class="btn btn-outline" onclick="calcFunc('abs')">|x|</button>
                </div>
                <h3 style="font-size:14px;font-weight:700;margin:18px 0 14px;">📋 Histórico</h3>
                <div id="calc-history" style="max-height:200px;overflow-y:auto;font-size:12px;color:var(--text-light);"></div>
            </div>
        </div>
    `;
    window._calcExpr = '';
    window._calcDisplay = '0';
    window._calcNew = true;
    window._calcHistory = [];
}

function calcNum(n) {
    const d = document.getElementById('calc-display');
    if (window._calcNew) { d.value = n; window._calcNew = false; }
    else { d.value = d.value === '0' ? n : d.value + n; }
    window._calcExpr += n;
}
function calcDot() {
    const d = document.getElementById('calc-display');
    if (window._calcNew) { d.value = '0.'; window._calcNew = false; window._calcExpr += '0.'; }
    else if (!d.value.includes('.')) { d.value += '.'; window._calcExpr += '.'; }
}
function calcOp(op) {
    const sym = {'÷':'/','×':'*','−':'-','+':'+'};
    window._calcExpr += sym[op] || op;
    window._calcNew = true;
}
function calcClear() { document.getElementById('calc-display').value = '0'; window._calcExpr = ''; window._calcNew = true; }
function calcNeg() { const d = document.getElementById('calc-display'); if (d.value !== '0') { d.value = d.value.startsWith('-') ? d.value.slice(1) : '-' + d.value; } }
function calcPerc() { const d = document.getElementById('calc-display'); d.value = parseFloat(d.value)/100; window._calcExpr = d.value; }
function calcBack() { const d = document.getElementById('calc-display'); d.value = d.value.length > 1 ? d.value.slice(0,-1) : '0'; window._calcExpr = d.value; }
function calcEquals() {
    try {
        const expr = window._calcExpr;
        const result = Function('"use strict";return (' + expr + ')')();
        const val = isFinite(result) ? parseFloat(result.toFixed(10)) : 'Erro';
        document.getElementById('calc-display').value = val;
        if (val !== 'Erro') {
            window._calcHistory.unshift(expr + ' = ' + val);
            if (window._calcHistory.length > 20) window._calcHistory.pop();
            const histEl = document.getElementById('calc-history');
            if (histEl) histEl.innerHTML = window._calcHistory.map(h => `<div style="padding:4px 0;border-bottom:1px solid var(--border);">${h}</div>`).join('');
        }
        window._calcExpr = val !== 'Erro' ? String(val) : '';
        window._calcNew = true;
    } catch(e) { document.getElementById('calc-display').value = 'Erro'; window._calcExpr = ''; window._calcNew = true; }
}
function calcFunc(fn) {
    const d = document.getElementById('calc-display');
    const v = parseFloat(d.value);
    let result;
    switch(fn) {
        case 'sin': result = Math.sin(v * Math.PI / 180); break;
        case 'cos': result = Math.cos(v * Math.PI / 180); break;
        case 'tan': result = Math.tan(v * Math.PI / 180); break;
        case 'log': result = Math.log10(v); break;
        case 'ln': result = Math.log(v); break;
        case 'sqrt': result = Math.sqrt(v); break;
        case 'pow2': result = v * v; break;
        case 'pow3': result = v * v * v; break;
        case 'pi': result = Math.PI; break;
        case 'e': result = Math.E; break;
        case 'fact': result = v <= 0 ? 1 : Array.from({length:Math.floor(v)},(_,i)=>i+1).reduce((a,b)=>a*b,1); break;
        case 'abs': result = Math.abs(v); break;
    }
    d.value = isFinite(result) ? parseFloat(result.toFixed(10)) : 'Erro';
    window._calcExpr = d.value;
    window._calcNew = true;
}
