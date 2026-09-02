let drawCanvas = null, drawCtx = null;
let drawTool = 'lapiseira';
let drawColor = '#2563EB';
let drawSize = 5;
let drawOpacity = 1;
let drawLayers = [];
let drawActiveLayer = 0;
let drawHistory = [];
let drawHistoryIdx = -1;
let drawW = 1280, drawH = 720;
let isDrawing = false;
let lastX = 0, lastY = 0;
let lastSpeed = 0;

const DRAW_PENS = [
    { id: 'lapiseira', icon: '✏️', label: 'Lapiseira', sizes: [0.5, 0.7, 0.9] },
    { id: 'esferografica', icon: '🖊️', label: 'Esferográfica' },
    { id: 'pincel', icon: '🖌️', label: 'Pincel' },
    { id: 'marcador', icon: '🖍️', label: 'Marcador' },
    { id: 'lapis_de_cor', icon: '✏️', label: 'Lápis Cor' },
    { id: 'carvao', icon: '🖤', label: 'Carvão' },
    { id: 'pastel', icon: '🖍️', label: 'Pastel' },
    { id: 'cera', icon: '✏️', label: 'Cera' },
    { id: 'caligrafia', icon: '🖊️', label: 'Caligrafia' },
    { id: 'arco_iris', icon: '🌈', label: 'Arco-Íris' },
    { id: 'neon', icon: '✨', label: 'Neon' },
    { id: 'pontilhismo', icon: '🎯', label: 'Pontilhismo' },
    { id: 'fogo', icon: '🔥', label: 'Fogo' },
    { id: 'aguarela', icon: '💧', label: 'Aguarela' },
    { id: 'borracha', icon: '🧹', label: 'Borracha' },
];

const DRAW_CANVAS_SIZES = [
    { label: 'A4 Retrato (2480×3508)', w: 2480, h: 3508 },
    { label: 'A4 Paisagem (3508×2480)', w: 3508, h: 2480 },
    { label: 'A3 (3508×4961)', w: 3508, h: 4961 },
    { label: 'Full HD (1920×1080)', w: 1920, h: 1080 },
    { label: 'HD (1280×720)', w: 1280, h: 720 },
    { label: '800×600', w: 800, h: 600 },
    { label: '1024×768', w: 1024, h: 768 },
];

const DRAW_PRESET_COLORS = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
    '#FFFFFF', '#FF0000', '#FF4400', '#FF8800', '#FFCC00',
    '#FFFF00', '#88FF00', '#00FF00', '#00FF88', '#00CCFF',
    '#0088FF', '#0044FF', '#0000FF', '#4400FF', '#8800FF',
    '#CC00FF', '#FF00FF', '#FF0088', '#FF0044', '#8B4513',
    '#A0522D', '#CD853F', '#D2691E', '#F4A460', '#2E8B57',
];

window.renderDesenho = function(area) {
    area.innerHTML = `
<div style="display:flex;flex-direction:column;height:calc(100vh - 80px);">
  <div class="page-header" style="padding:8px 0 4px 0;margin-bottom:4px;">
    <h2 style="font-size:18px;">🎨 Desenho Avançado</h2>
    <p style="font-size:12px;">Pincéis, camadas, tablet USB &middot; <span id="draw-pos" style="color:var(--text-light);font-family:monospace;font-size:11px;">0, 0</span></p>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 10px;background:var(--surface);border-radius:10px;border:1px solid var(--border);margin-bottom:6px;">
    <div style="display:flex;overflow-x:auto;gap:3px;flex:1;min-width:0;scrollbar-width:thin;" id="draw-pen-bar">
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <div style="position:relative;">
        <input type="color" id="draw-color-pick" value="${drawColor}" onchange="drawColor=this.value;drawUpdateColorUI()" style="width:32px;height:30px;border:2px solid var(--border);border-radius:6px;cursor:pointer;padding:0;">
      </div>
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="font-size:10px;color:var(--text-light);white-space:nowrap;">📏 <span id="draw-size-label">${drawSize}</span></span>
        <input type="range" min="1" max="50" value="${drawSize}" id="draw-size" oninput="drawSize=parseInt(this.value);document.getElementById('draw-size-label').textContent=this.value" style="width:80px;">
      </div>
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="font-size:10px;color:var(--text-light);white-space:nowrap;">🔆 <span id="draw-opacity-label">${Math.round(drawOpacity*100)}%</span></span>
        <input type="range" min="1" max="100" value="${Math.round(drawOpacity*100)}" id="draw-opacity" oninput="drawOpacity=this.value/100;document.getElementById('draw-opacity-label').textContent=this.value+'%'" style="width:70px;">
      </div>
      <select class="form-input" id="draw-size-select" onchange="drawResizeCanvas(this.value)" style="font-size:10px;padding:4px 6px;width:auto;max-width:140px;">
        ${DRAW_CANVAS_SIZES.map(s => `<option value="${s.w}x${s.h}" ${drawW===s.w&&drawH===s.h?'selected':''}>${s.label}</option>`).join('')}
        <option value="custom">✏️ Custom</option>
      </select>
    </div>
  </div>
  <div style="flex:1;display:flex;gap:8px;min-height:0;">
    <div style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--bg);border-radius:10px;border:1px solid var(--border);overflow:hidden;position:relative;">
      <canvas id="draw-canvas" style="display:block;cursor:crosshair;background:#fff;"></canvas>
    </div>
    <div style="width:180px;flex-shrink:0;display:flex;flex-direction:column;gap:6px;">
      <div class="card" style="padding:10px;flex:1;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="font-size:12px;font-weight:700;">📑 Camadas</h3>
          <div style="display:flex;gap:3px;">
            <button class="btn btn-sm btn-ghost" onclick="drawAddLayer()" style="padding:2px 6px;font-size:11px;" title="Adicionar">➕</button>
            <button class="btn btn-sm btn-ghost" onclick="drawDuplicateLayer()" style="padding:2px 6px;font-size:11px;" title="Duplicar">📋</button>
            <button class="btn btn-sm btn-ghost" onclick="drawDeleteLayer()" style="padding:2px 6px;font-size:11px;" title="Remover">✕</button>
          </div>
        </div>
        <div id="draw-layer-list" style="display:flex;flex-direction:column;gap:3px;"></div>
        <hr style="border:0;border-top:1px solid var(--border);margin:10px 0;">
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-ghost" onclick="drawUndo()" style="flex:1;padding:4px;font-size:11px;" title="Desfazer">↩ Desfazer</button>
          <button class="btn btn-sm btn-ghost" onclick="drawRedo()" style="flex:1;padding:4px;font-size:11px;" title="Refazer">↪ Refazer</button>
        </div>
        <div style="display:flex;gap:4px;margin-top:4px;">
          <button class="btn btn-sm btn-ghost" onclick="drawFloodFill()" style="flex:1;padding:4px;font-size:11px;" title="Preenchimento">🪣 Preencher</button>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;padding:4px 8px;background:var(--surface);border-radius:10px;border:1px solid var(--border);">
        <button class="btn btn-sm btn-outline" onclick="drawUndo()" style="padding:4px 8px;font-size:11px;" title="Desfazer">↩</button>
        <button class="btn btn-sm btn-outline" onclick="drawRedo()" style="padding:4px 8px;font-size:11px;" title="Refazer">↪</button>
        <button class="btn btn-sm btn-danger" onclick="drawClear()" style="padding:4px 8px;font-size:11px;" title="Limpar">🗑</button>
        <button class="btn btn-sm btn-outline" onclick="drawSavePNG()" style="padding:4px 8px;font-size:11px;" title="Exportar PNG">📥 PNG</button>
        <button class="btn btn-sm btn-success" onclick="drawSaveFirebase()" style="padding:4px 8px;font-size:11px;" title="Guardar na cloud">☁️ Guardar</button>
        <button class="btn btn-sm btn-outline" onclick="drawLoadFirebase()" style="padding:4px 8px;font-size:11px;" title="Carregar da cloud">📂 Carregar</button>
        <button class="btn btn-sm btn-outline" onclick="drawLoadImage()" style="padding:4px 8px;font-size:11px;" title="Abrir imagem">🖼️</button>
      </div>
    </div>
  </div>
</div>`;
    drawInit();
};

function drawInit() {
    drawCanvas = document.getElementById('draw-canvas');
    if (!drawCanvas) return;
    const container = drawCanvas.parentElement;
    const cw = container.clientWidth - 4;
    const ch = container.clientHeight - 4;
    if (drawLayers.length === 0) drawSetupLayers();
    drawCanvas.width = drawW;
    drawCanvas.height = drawH;
    drawCanvas.style.maxWidth = '100%';
    drawCanvas.style.maxHeight = '100%';
    drawCtx = drawCanvas.getContext('2d');
    drawComposite();
    drawRenderPenBar();
    drawRenderLayers();
    drawSetupEvents();
}

function drawSetupLayers() {
    drawLayers = [];
    const c = document.createElement('canvas');
    c.width = drawW; c.height = drawH;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, drawW, drawH);
    drawLayers.push({ name: 'Camada 1', visible: true, canvas: c, ctx });
    drawActiveLayer = 0;
    drawHistory = [];
    drawHistoryIdx = -1;
    drawSaveState();
}

function drawComposite() {
    if (!drawCtx) return;
    drawCtx.clearRect(0, 0, drawW, drawH);
    for (const layer of drawLayers) {
        if (layer.visible) {
            drawCtx.drawImage(layer.canvas, 0, 0);
        }
    }
}

function drawCanvasToDataURL() {
    if (!drawCanvas) return '';
    return drawCanvas.toDataURL('image/png');
}

function drawSaveState() {
    if (!drawActiveLayerCanvas()) return;
    const cur = drawActiveLayerCanvas().toDataURL();
    drawHistory = drawHistory.slice(0, drawHistoryIdx + 1);
    drawHistory.push(cur);
    if (drawHistory.length > 50) drawHistory.shift();
    drawHistoryIdx = drawHistory.length - 1;
}

function drawActiveLayerCanvas() {
    return drawLayers[drawActiveLayer]?.canvas || null;
}

function drawActiveLayerCtx() {
    return drawLayers[drawActiveLayer]?.ctx || null;
}

function drawSetupEvents() {
    if (!drawCanvas) return;
    let lastTime = 0;

    function getPos(e) {
        const rect = drawCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (drawW / rect.width),
            y: (e.clientY - rect.top) * (drawH / rect.height),
        };
    }

    drawCanvas.onpointerdown = function(e) {
        e.preventDefault();
        drawCanvas.setPointerCapture(e.pointerId);
        const p = getPos(e);
        isDrawing = true;
        lastX = p.x; lastY = p.y;
        lastSpeed = 0; lastTime = Date.now();
        const ctx = drawActiveLayerCtx();
        if (!ctx) return;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        drawStrokeStart(p.x, p.y);
        drawSaveState();
    };

    drawCanvas.onpointermove = function(e) {
        e.preventDefault();
        if (!drawCanvas.hasPointerCapture(e.pointerId) && !isDrawing) {
            const p = getPos(e);
            document.getElementById('draw-pos').textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
            return;
        }
        if (!isDrawing) return;
        const p = getPos(e);
        const now = Date.now();
        const dt = Math.max(1, now - lastTime);
        const dx = p.x - lastX, dy = p.y - lastY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt * 100;
        lastSpeed = speed;
        lastTime = now;
        const pressure = e.pressure || 0.5;
        drawStroke(p.x, p.y, pressure, lastX, lastY, speed);
        lastX = p.x; lastY = p.y;
        drawComposite();
    };

    drawCanvas.onpointerup = function(e) {
        e.preventDefault();
        isDrawing = false;
        drawStrokeEnd();
        drawComposite();
    };

    drawCanvas.onpointerleave = function() {
        if (isDrawing) {
            isDrawing = false;
            drawStrokeEnd();
            drawComposite();
        }
    };

    drawCanvas.ontouchstart = function(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        const t = e.touches[0];
        const rect = drawCanvas.getBoundingClientRect();
        const x = (t.clientX - rect.left) * (drawW / rect.width);
        const y = (t.clientY - rect.top) * (drawH / rect.height);
        isDrawing = true; lastX = x; lastY = y;
        lastSpeed = 0; lastTime = Date.now();
        const ctx = drawActiveLayerCtx();
        if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
        drawStrokeStart(x, y);
        drawSaveState();
    };

    drawCanvas.ontouchmove = function(e) {
        e.preventDefault();
        if (!isDrawing || e.touches.length !== 1) return;
        const t = e.touches[0];
        const rect = drawCanvas.getBoundingClientRect();
        const x = (t.clientX - rect.left) * (drawW / rect.width);
        const y = (t.clientY - rect.top) * (drawH / rect.height);
        const now = Date.now();
        const dt = Math.max(1, now - lastTime);
        const dx = x - lastX, dy = y - lastY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt * 100;
        lastSpeed = speed; lastTime = now;
        drawStroke(x, y, 0.5, lastX, lastY, speed);
        lastX = x; lastY = y;
        drawComposite();
    };

    drawCanvas.ontouchend = function() { isDrawing = false; drawStrokeEnd(); drawComposite(); };
    drawCanvas.ontouchcancel = function() { isDrawing = false; drawStrokeEnd(); drawComposite(); };
    drawCanvas.style.touchAction = 'none';
}

function drawStrokeStart() {
    const ctx = drawActiveLayerCtx();
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = drawTool === 'borracha' ? 'destination-out' : 'source-over';
    ctx.shadowBlur = 0;
}

function drawStroke(x, y, pressure, lx, ly, speed) {
    const ctx = drawActiveLayerCtx();
    if (!ctx) return;
    const size = drawSize;
    const p = Math.min(1, Math.max(0, pressure || 0.5));
    const s = speed || 0;

    ctx.globalAlpha = drawOpacity;

    switch (drawTool) {
        case 'lapiseira': {
            const mm = size <= 1 ? 0.5 : size <= 3 ? 0.7 : 0.9;
            const ls = Math.max(0.5, mm * 2);
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * 0.95;
            ctx.lineWidth = ls;
            ctx.lineTo(x, y);
            ctx.stroke();
            break;
        }
        case 'esferografica': {
            const alphaVar = 0.85 + Math.random() * 0.15;
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * alphaVar;
            ctx.lineWidth = Math.max(1, size * 0.6);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.lineWidth = Math.max(0.5, size * 0.3);
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * 0.3;
            ctx.beginPath(); ctx.moveTo(lx + 1, ly + 1);
            ctx.lineTo(x + 1, y + 1);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'pincel': {
            const speedFactor = Math.min(1, Math.max(0.2, 1 - s / 200));
            const w = size * (0.8 + p * 1.2) * speedFactor;
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * (0.5 + p * 0.5);
            ctx.lineWidth = w;
            ctx.lineTo(x, y);
            ctx.stroke();
            break;
        }
        case 'marcador': {
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * 0.35;
            ctx.lineWidth = size * 2.5;
            ctx.lineTo(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'lapis_de_cor': {
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * (0.3 + p * 0.3);
            ctx.lineWidth = Math.max(0.8, size * 0.5);
            ctx.lineTo(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lx + (Math.random() - 0.5) * 2, ly + (Math.random() - 0.5) * 2);
            ctx.lineTo(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'carvao': {
            for (let i = 0; i < 4; i++) {
                const ox = (Math.random() - 0.5) * size * 0.5;
                const oy = (Math.random() - 0.5) * size * 0.5;
                ctx.strokeStyle = drawColor;
                ctx.globalAlpha = drawOpacity * (0.15 + Math.random() * 0.2);
                ctx.lineWidth = size * (0.3 + Math.random() * 0.7) * p;
                ctx.beginPath();
                ctx.moveTo(lx + ox, ly + oy);
                ctx.lineTo(x + ox, y + oy);
                ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'pastel': {
            for (let i = 0; i < 3; i++) {
                ctx.strokeStyle = drawColor;
                ctx.globalAlpha = drawOpacity * (0.08 + Math.random() * 0.1);
                ctx.lineWidth = size * (1.5 + Math.random() * 1.5);
                ctx.beginPath();
                ctx.moveTo(lx + (Math.random() - 0.5) * 4, ly + (Math.random() - 0.5) * 4);
                ctx.lineTo(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);
                ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'cera': {
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * 0.6;
            ctx.lineWidth = size * 1.5;
            ctx.lineTo(x, y);
            ctx.stroke();
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = drawOpacity * (0.2 + Math.random() * 0.2);
                ctx.lineWidth = size * (0.5 + Math.random() * 0.5);
                ctx.beginPath();
                ctx.moveTo(lx + (Math.random() - 0.5) * 6, ly + (Math.random() - 0.5) * 6);
                ctx.lineTo(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6);
                ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'caligrafia': {
            const angle = Math.atan2(y - ly, x - lx);
            const w = size * (0.2 + Math.abs(Math.cos(angle)) * 0.8) * (0.5 + p * 0.5);
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * 0.9;
            ctx.lineWidth = w;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'arco_iris': {
            const grad = ctx.createLinearGradient(lx, ly, x, y);
            grad.addColorStop(0, '#FF0000');
            grad.addColorStop(0.16, '#FF8800');
            grad.addColorStop(0.33, '#FFFF00');
            grad.addColorStop(0.5, '#00FF00');
            grad.addColorStop(0.66, '#0088FF');
            grad.addColorStop(0.83, '#8800FF');
            grad.addColorStop(1, '#FF00FF');
            ctx.strokeStyle = grad;
            ctx.globalAlpha = drawOpacity * 0.85;
            ctx.lineWidth = size;
            ctx.lineTo(x, y);
            ctx.stroke();
            break;
        }
        case 'neon': {
            ctx.shadowColor = drawColor;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = drawOpacity * 0.9;
            ctx.lineWidth = size;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = drawOpacity * 0.4;
            ctx.lineWidth = Math.max(1, size * 0.35);
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.shadowBlur = 0;
            break;
        }
        case 'pontilhismo': {
            const dist = Math.sqrt((x - lx) ** 2 + (y - ly) ** 2);
            const steps = Math.max(1, Math.floor(dist / (2 + size * 0.2)));
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const px = lx + (x - lx) * t + (Math.random() - 0.5) * size * 0.6;
                const py = ly + (y - ly) * t + (Math.random() - 0.5) * size * 0.6;
                const r = size * 0.15 * (0.5 + Math.random() * 0.5) * p;
                ctx.globalAlpha = drawOpacity * (0.5 + Math.random() * 0.5);
                ctx.fillStyle = drawColor;
                ctx.beginPath();
                ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'fogo': {
            const colors = ['#FF0000', '#FF4400', '#FF8800', '#FFCC00', '#FFFF00'];
            for (let i = 0; i < 3; i++) {
                const c = colors[Math.floor(Math.random() * colors.length)];
                ctx.strokeStyle = c;
                ctx.globalAlpha = drawOpacity * (0.3 + Math.random() * 0.4);
                ctx.lineWidth = size * (0.3 + Math.random() * 0.7) * p;
                ctx.beginPath();
                ctx.moveTo(lx + (Math.random() - 0.5) * size * 0.5, ly + (Math.random() - 0.5) * size * 0.5);
                ctx.lineTo(x + (Math.random() - 0.5) * size * 0.5, y + (Math.random() - 0.5) * size * 0.5);
                ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'aguarela': {
            for (let i = 0; i < 4; i++) {
                ctx.globalAlpha = drawOpacity * (0.04 + Math.random() * 0.08);
                ctx.strokeStyle = drawColor;
                ctx.lineWidth = size * (0.8 + Math.random() * 2.5) * p;
                ctx.beginPath();
                ctx.moveTo(lx + (Math.random() - 0.5) * 8, ly + (Math.random() - 0.5) * 8);
                ctx.lineTo(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8);
                ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
        case 'borracha': {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = size * 3;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath(); ctx.moveTo(x, y);
            break;
        }
    }
}

function drawStrokeEnd() {
    const ctx = drawActiveLayerCtx();
    if (!ctx) return;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.beginPath();
}

function drawRenderPenBar() {
    const bar = document.getElementById('draw-pen-bar');
    if (!bar) return;
    bar.innerHTML = DRAW_PENS.map(p => `
        <button class="btn btn-sm ${drawTool === p.id ? 'btn-primary' : 'btn-outline'}" onclick="drawSelectPen('${p.id}')" style="padding:4px 8px;font-size:11px;white-space:nowrap;flex-shrink:0;" title="${p.label}">
            ${p.icon} ${p.label}
        </button>
    `).join('');
}

function drawSelectPen(id) {
    drawTool = id;
    drawRenderPenBar();
    drawCanvas.style.cursor = id === 'borracha' ? 'not-allowed' : 'crosshair';
}

function drawUpdateColorUI() {
    document.getElementById('draw-color-pick').value = drawColor;
}

function drawRenderLayers() {
    const el = document.getElementById('draw-layer-list');
    if (!el) return;
    el.innerHTML = drawLayers.map((l, i) => `
        <div onclick="drawSelectLayer(${i})" style="display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:6px;cursor:pointer;background:${drawActiveLayer === i ? 'var(--primary)' : 'var(--surface)'};border:1px solid ${drawActiveLayer === i ? 'var(--primary)' : 'var(--border)'};transition:all 0.15s;">
            <span onclick="event.stopPropagation();drawToggleLayer(${i})" style="cursor:pointer;font-size:12px;color:${drawActiveLayer === i ? '#fff' : l.visible ? 'var(--text)' : 'var(--text-light)'};">${l.visible ? '👁' : '🚫'}</span>
            <span style="flex:1;font-size:11px;font-weight:600;color:${drawActiveLayer === i ? '#fff' : 'var(--text)'};">${escapeHTML(l.name)}</span>
            <button class="btn btn-sm btn-ghost" style="padding:1px 4px;font-size:10px;" onclick="event.stopPropagation();drawMoveLayerUp(${i})" title="Subir">⬆</button>
            <button class="btn btn-sm btn-ghost" style="padding:1px 4px;font-size:10px;" onclick="event.stopPropagation();drawMoveLayerDown(${i})" title="Descer">⬇</button>
            <button class="btn btn-sm btn-ghost" style="padding:1px 4px;font-size:10px;" onclick="event.stopPropagation();drawMergeDown(${i})" title="Agrupar para baixo">⬇</button>
        </div>
    `).join('');
}

function drawSelectLayer(i) {
    if (i < 0 || i >= drawLayers.length) return;
    drawSaveLayerCanvas();
    drawActiveLayer = i;
    drawRenderLayers();
    drawComposite();
    drawHistory = [];
    drawHistoryIdx = -1;
    drawSaveState();
}

function drawSaveLayerCanvas() {
    const layer = drawLayers[drawActiveLayer];
    if (!layer) return;
    const img = new Image();
    img.src = drawCanvas.toDataURL();
    img.onload = function() {
        layer.ctx.clearRect(0, 0, drawW, drawH);
        layer.ctx.drawImage(img, 0, 0);
    };
}

function drawToggleLayer(i) {
    if (i < 0 || i >= drawLayers.length) return;
    drawLayers[i].visible = !drawLayers[i].visible;
    drawComposite();
    drawRenderLayers();
}

function drawAddLayer() {
    const c = document.createElement('canvas');
    c.width = drawW; c.height = drawH;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, drawW, drawH);
    drawLayers.push({ name: 'Camada ' + (drawLayers.length + 1), visible: true, canvas: c, ctx });
    drawActiveLayer = drawLayers.length - 1;
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawRenderLayers();
}

function drawDuplicateLayer() {
    const src = drawLayers[drawActiveLayer];
    if (!src) return;
    const c = document.createElement('canvas');
    c.width = drawW; c.height = drawH;
    const ctx = c.getContext('2d');
    ctx.drawImage(src.canvas, 0, 0);
    drawLayers.splice(drawActiveLayer + 1, 0, { name: src.name + ' (cópia)', visible: true, canvas: c, ctx });
    drawActiveLayer = drawActiveLayer + 1;
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawComposite();
    drawRenderLayers();
}

function drawDeleteLayer() {
    if (drawLayers.length <= 1) return showToast('Precisas de pelo menos 1 camada', 'warning');
    drawLayers.splice(drawActiveLayer, 1);
    drawActiveLayer = Math.min(drawActiveLayer, drawLayers.length - 1);
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawComposite();
    drawRenderLayers();
}

function drawMoveLayerUp(i) {
    if (i >= drawLayers.length - 1) return;
    [drawLayers[i], drawLayers[i + 1]] = [drawLayers[i + 1], drawLayers[i]];
    if (drawActiveLayer === i) drawActiveLayer = i + 1;
    else if (drawActiveLayer === i + 1) drawActiveLayer = i;
    drawComposite();
    drawRenderLayers();
}

function drawMoveLayerDown(i) {
    if (i <= 0) return;
    [drawLayers[i], drawLayers[i - 1]] = [drawLayers[i - 1], drawLayers[i]];
    if (drawActiveLayer === i) drawActiveLayer = i - 1;
    else if (drawActiveLayer === i - 1) drawActiveLayer = i;
    drawComposite();
    drawRenderLayers();
}

function drawMergeDown(i) {
    if (i <= 0) return showToast('Já está na camada inferior', 'warning');
    const upper = drawLayers[i];
    const lower = drawLayers[i - 1];
    lower.ctx.drawImage(upper.canvas, 0, 0);
    drawLayers.splice(i, 1);
    drawActiveLayer = Math.min(drawActiveLayer, drawLayers.length - 1);
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawComposite();
    drawRenderLayers();
}

function drawUndo() {
    if (drawHistoryIdx <= 0) return;
    drawHistoryIdx--;
    const ctx = drawActiveLayerCtx();
    if (!ctx) return;
    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, drawW, drawH);
        ctx.drawImage(img, 0, 0);
        drawComposite();
    };
    img.src = drawHistory[drawHistoryIdx];
}

function drawRedo() {
    if (drawHistoryIdx >= drawHistory.length - 1) return;
    drawHistoryIdx++;
    const ctx = drawActiveLayerCtx();
    if (!ctx) return;
    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, drawW, drawH);
        ctx.drawImage(img, 0, 0);
        drawComposite();
    };
    img.src = drawHistory[drawHistoryIdx];
}

function drawClear() {
    if (!confirm('Tens a certeza? Todo o desenho será apagado.')) return;
    for (const layer of drawLayers) {
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(0, 0, drawW, drawH);
    }
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawComposite();
}

function drawFloodFill() {
    showToast('🪣 Clica numa área para preencher', 'info');
    const handler = function(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (drawW / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (drawH / rect.height));
        drawCanvas.removeEventListener('click', handler);
        setTimeout(() => drawPerformFloodFill(x, y), 50);
    };
    drawCanvas.addEventListener('click', handler, { once: true });
}

function drawPerformFloodFill(sx, sy) {
    const ctx = drawActiveLayerCtx();
    if (!ctx) return;
    const w = drawW, h = drawH;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const idx = (sy * w + sx) * 4;
    const tr = data[idx], tg = data[idx + 1], tb = data[idx + 2], ta = data[idx + 3];
    const fill = hexToRgba(drawColor, Math.round(drawOpacity * 255));
    if (Math.abs(tr - fill.r) < 5 && Math.abs(tg - fill.g) < 5 && Math.abs(tb - fill.b) < 5 && Math.abs(ta - fill.a) < 5) return;
    const visited = new Uint8Array(w * h);
    const q = new Int32Array(w * h * 2);
    let head = 0, tail = 0;
    q[tail++] = sx; q[tail++] = sy;
    drawSaveState();
    while (head < tail) {
        const cx = q[head++], cy = q[head++];
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
        const pi = cy * w + cx;
        if (visited[pi]) continue;
        const di = pi * 4;
        if (Math.abs(data[di] - tr) > 10 || Math.abs(data[di + 1] - tg) > 10 || Math.abs(data[di + 2] - tb) > 10) continue;
        visited[pi] = 1;
        data[di] = fill.r; data[di + 1] = fill.g; data[di + 2] = fill.b; data[di + 3] = fill.a;
        q[tail++] = cx + 1; q[tail++] = cy;
        q[tail++] = cx - 1; q[tail++] = cy;
        q[tail++] = cx; q[tail++] = cy + 1;
        q[tail++] = cx; q[tail++] = cy - 1;
    }
    ctx.putImageData(imageData, 0, 0);
    drawComposite();
    showToast('✅ Área preenchida!', 'success');
}

function hexToRgba(hex, a) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16), a: a ?? 255 } : { r: 0, g: 0, b: 0, a: 255 };
}

function drawSavePNG() {
    if (!drawCanvas) return;
    const link = document.createElement('a');
    link.download = (window._drawName || 'desenho') + '.png';
    link.href = drawCanvas.toDataURL('image/png');
    link.click();
    showToast('📥 PNG exportado!', 'success');
}

async function drawSaveFirebase() {
    if (!drawCanvas) return;
    if (!currentUser) return showToast('Precisas de estar logado', 'error');
    const nome = prompt('Nome do desenho:', window._drawName || 'Desenho');
    if (!nome) return;
    window._drawName = nome;
    const dataUrl = drawCanvas.toDataURL('image/png');
    const layersData = drawLayers.map(l => ({ name: l.name, visible: l.visible, data: l.canvas.toDataURL() }));
    const payload = {
        nome, data: dataUrl, layers: layersData,
        width: drawW, height: drawH,
        autorId: currentUser.uid, autorNome: userProfile?.nome || '',
        updatedAt: Date.now(),
        createdAt: window._drawCreatedAt || Date.now(),
    };
    if (window._drawKey) {
        await db.ref('drawings/' + window._drawKey).set(payload);
    } else {
        const ref = db.ref('drawings').push();
        window._drawKey = ref.key;
        window._drawCreatedAt = payload.createdAt;
        await ref.set(payload);
    }
    showToast('☁️ Guardado na cloud!', 'success');
}

async function drawLoadFirebase() {
    if (!currentUser) return showToast('Precisas de estar logado', 'error');
    const snap = await dbGet('drawings');
    const drawings = snap ? Object.entries(snap).filter(([, v]) => v.autorId === currentUser.uid).map(([k, v]) => ({ id: k, ...v })) : [];
    if (drawings.length === 0) return showToast('Sem desenhos guardados', 'error');
    const list = drawings.map((d, i) => `${i + 1}. ${d.nome}`).join('\n');
    const choice = prompt('Desenhos:\n' + list + '\n\nNúmero:');
    const d = drawings[parseInt(choice) - 1];
    if (!d || !d.data) return;
    window._drawKey = d.id;
    window._drawName = d.nome;
    window._drawCreatedAt = d.createdAt;
    if (d.width && d.height) {
        drawW = d.width; drawH = d.height;
        drawCanvas.width = drawW; drawCanvas.height = drawH;
    }
    drawLayers = [];
    if (d.layers && d.layers.length > 0) {
        for (const ld of d.layers) {
            const c = document.createElement('canvas');
            c.width = drawW; c.height = drawH;
            const ctx = c.getContext('2d');
            const img = new Image();
            await new Promise(resolve => {
                img.onload = function() {
                    ctx.drawImage(img, 0, 0);
                    resolve();
                };
                img.src = ld.data;
            });
            drawLayers.push({ name: ld.name, visible: ld.visible !== false, canvas: c, ctx });
        }
    } else {
        const c = document.createElement('canvas');
        c.width = drawW; c.height = drawH;
        const ctx = c.getContext('2d');
        const img = new Image();
        await new Promise(resolve => {
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                resolve();
            };
            img.src = d.data;
        });
        drawLayers.push({ name: 'Camada 1', visible: true, canvas: c, ctx });
    }
    drawActiveLayer = 0;
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawComposite();
    drawRenderLayers();
    showToast('📂 Carregado!', 'success');
}

function drawLoadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
                const c = document.createElement('canvas');
                c.width = drawW; c.height = drawH;
                const ctx = c.getContext('2d');
                const scale = Math.min(drawW / img.width, drawH / img.height);
                const x = (drawW - img.width * scale) / 2;
                const y = (drawH - img.height * scale) / 2;
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, drawW, drawH);
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                drawLayers.unshift({ name: 'Imagem', visible: true, canvas: c, ctx });
                drawActiveLayer = 0;
                drawHistory = []; drawHistoryIdx = -1;
                drawSaveState();
                drawComposite();
                drawRenderLayers();
                showToast('🖼️ Imagem carregada como camada base!', 'success');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function drawResizeCanvas(val) {
    if (val === 'custom') {
        const w = prompt('Largura (px):', drawW);
        const h = prompt('Altura (px):', drawH);
        if (w && h) drawApplyResize(parseInt(w), parseInt(h));
        return;
    }
    const parts = val.split('x');
    if (parts.length === 2) drawApplyResize(parseInt(parts[0]), parseInt(parts[1]));
}

function drawApplyResize(w, h) {
    if (isNaN(w) || isNaN(h) || w < 100 || h < 100) return showToast('Dimensões inválidas', 'error');
    for (const layer of drawLayers) {
        const tempC = document.createElement('canvas');
        tempC.width = drawW; tempC.height = drawH;
        const tempCtx = tempC.getContext('2d');
        tempCtx.drawImage(layer.canvas, 0, 0);
        layer.canvas.width = w; layer.canvas.height = h;
        layer.ctx = layer.canvas.getContext('2d');
        layer.ctx.drawImage(tempC, 0, 0);
    }
    drawW = w; drawH = h;
    drawCanvas.width = w; drawCanvas.height = h;
    drawHistory = []; drawHistoryIdx = -1;
    drawSaveState();
    drawComposite();
    showToast(`✅ Tela redimensionada para ${w}×${h}`, 'success');
}
