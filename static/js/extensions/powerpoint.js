let pptSlides = [];
let pptCurrentIdx = 0;
let pptNotes = {};
let pptTransition = 'none';
let pptInPresentation = false;

window.renderPowerpoint = function(area) {
    if (pptSlides.length === 0) {
        pptSlides = [{ title: 'Slide 1', content: 'Clica para editar...', bg: '#0F172A', objects: [] }];
        pptNotes = {};
    }
    pptCurrentIdx = 0;
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>📽️ PowerPoint</h2><p>Cria apresentações com transições e modo apresentação</p></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <select class="form-input" style="width:120px;padding:6px 10px;font-size:12px;" onchange="pptSetTransition(this.value)">
                    <option value="none">Sem transição</option><option value="fade">Fade</option>
                    <option value="slide">Slide</option><option value="zoom">Zoom</option>
                </select>
                <button class="btn btn-sm btn-primary" onclick="pptAddSlide()">➕ Slide</button>
                <button class="btn btn-sm btn-success" onclick="pptStartPresentation()">▶️ Apresentar</button>
                <button class="btn btn-sm btn-primary" onclick="pptSave()">💾 Guardar</button>
                <button class="btn btn-sm btn-outline" onclick="pptLoad()">📂 Carregar</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:200px 1fr 200px;gap:14px;height:calc(100vh - 220px);">
            <div class="card" style="padding:8px;overflow-y:auto;" id="ppt-sidebar"></div>
            <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;" id="ppt-main">
                <div id="ppt-slide-area" style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg);">
                    <div id="ppt-slide-view" style="width:100%;max-width:800px;aspect-ratio:16/9;border-radius:12px;box-shadow:var(--shadow-lg);position:relative;overflow:hidden;"></div>
                </div>
                <div style="padding:8px 14px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center;background:var(--surface);">
                    <input type="color" id="ppt-bg-color" style="width:30px;height:26px;border:none;cursor:pointer;padding:0;" onchange="pptSetBG('color',this.value)" title="Cor de fundo">
                    <select class="form-input" style="width:100px;padding:4px 8px;font-size:11px;" onchange="pptSetBG('gradient',this.value)">
                        <option value="">Gradiente</option>
                        <option value="linear-gradient(135deg,#667eea,#764ba2)">Roxo</option>
                        <option value="linear-gradient(135deg,#f093fb,#f5576c)">Rosa</option>
                        <option value="linear-gradient(135deg,#4facfe,#00f2fe)">Azul</option>
                        <option value="linear-gradient(135deg,#43e97b,#38f9d7)">Verde</option>
                        <option value="linear-gradient(135deg,#fa709a,#fee140)">Pôr-do-sol</option>
                    </select>
                    <input class="form-input" style="width:140px;padding:4px 8px;font-size:11px;" placeholder="URL de imagem de fundo" onchange="pptSetBG('image',this.value)">
                    <button class="btn btn-sm btn-ghost" onclick="pptAddTextBox()" title="Adicionar texto">📝 Texto</button>
                    <button class="btn btn-sm btn-ghost" onclick="pptAddImage()" title="Adicionar imagem">🖼️</button>
                    <span style="flex:1;"></span>
                    <button class="btn btn-sm btn-danger" onclick="pptRemoveSlide(pptCurrentIdx)">✕</button>
                    <button class="btn btn-sm btn-outline" onclick="pptDuplicateSlide(pptCurrentIdx)">📋 Duplicar</button>
                </div>
            </div>
            <div class="card" style="padding:10px;overflow-y:auto;">
                <h3 style="font-size:13px;font-weight:700;margin-bottom:10px;">📝 Notas do orador</h3>
                <textarea id="ppt-speaker-notes" class="form-input" style="min-height:120px;font-size:12px;resize:vertical;" placeholder="Escreve notas para este slide..." onchange="pptSaveNotes(this.value)"></textarea>
            </div>
        </div>
    `;
    pptRenderSidebar();
    pptRenderSlide();
};

function pptRenderSidebar() {
    const sb = document.getElementById('ppt-sidebar');
    if (!sb) return;
    sb.innerHTML = '<div style="font-size:11px;font-weight:700;color:var(--text-light);padding:6px 8px;margin-bottom:4px;">SLIDES</div>' +
    pptSlides.map((s, i) => `
        <div onclick="pptSelectSlide(${i})" style="padding:8px;margin-bottom:6px;border-radius:8px;cursor:pointer;background:${i === pptCurrentIdx ? 'var(--primary)' : 'var(--bg)'};border:2px solid ${i === pptCurrentIdx ? 'var(--primary)' : 'var(--border)'};position:relative;">
            <div style="font-size:10px;color:${i === pptCurrentIdx ? 'rgba(255,255,255,0.7)' : 'var(--text-light)'};">Slide ${i + 1}</div>
            <div style="font-size:11px;font-weight:600;color:${i === pptCurrentIdx ? '#fff' : 'var(--text)'};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(s.title)}</div>
            <div style="font-size:9px;color:${i === pptCurrentIdx ? 'rgba(255,255,255,0.5)' : 'var(--text-light)'};margin-top:2px;">${pptNotes[i] ? '📝' : ''} ${pptSlides.length > 1 ? '↕' : ''}</div>
        </div>
    `).join('');
}

function pptRenderSlide() {
    const s = pptSlides[pptCurrentIdx];
    if (!s) return;
    const view = document.getElementById('ppt-slide-view');
    if (!view) return;
    const bgStyle = s.bg || '#0F172A';
    view.style.background = bgStyle;
    view.style.transition = 'all 0.4s ease';
    view.contentEditable = false;
    let objectsHtml = '';
    if (s.objects && s.objects.length > 0) {
        objectsHtml = s.objects.map((obj, i) => {
            let style = `position:absolute;left:${obj.x || 0}px;top:${obj.y || 0}px;width:${obj.w || 200}px;`;
            if (obj.type === 'text') {
                style += `font-size:${obj.fontSize || 20}px;color:${obj.color || '#fff'};font-weight:${obj.bold ? 'bold' : 'normal'};font-style:${obj.italic ? 'italic' : 'normal'};text-align:${obj.align || 'left'};`;
                return `<div style="${style}" ondblclick="pptEditObject(${i})">${escapeHTML(obj.content || 'Texto')}</div>`;
            } else if (obj.type === 'image') {
                return `<img src="${escapeHTML(obj.src || '')}" style="${style}height:${obj.h || 150}px;object-fit:contain;border-radius:4px;" ondblclick="pptEditObject(${i})"/>`;
            }
            return '';
        }).join('');
    }
    view.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40px;position:relative;color:#fff;">
            ${objectsHtml}
            <div style="position:relative;z-index:1;">
                <h1 style="font-size:42px;font-weight:900;margin-bottom:16px;outline:none;cursor:text;" oninput="pptUpdateTitle(this.textContent)" onblur="pptUpdateTitle(this.textContent)">${escapeHTML(s.title)}</h1>
                <p style="font-size:20px;opacity:0.8;outline:none;max-width:600px;cursor:text;line-height:1.5;" oninput="pptUpdateContent(this.innerHTML)" onblur="pptUpdateContent(this.innerHTML)">${s.content}</p>
            </div>
        </div>
    `;
    const notesEl = document.getElementById('ppt-speaker-notes');
    if (notesEl) notesEl.value = pptNotes[pptCurrentIdx] || '';
}

function pptSelectSlide(i) { pptCurrentIdx = i; pptRenderSidebar(); pptRenderSlide(); }
function pptAddSlide() {
    pptSlides.push({ title: 'Slide ' + (pptSlides.length + 1), content: 'Novo slide...', bg: '#0F172A', objects: [] });
    pptCurrentIdx = pptSlides.length - 1;
    pptRenderSidebar(); pptRenderSlide();
}
function pptRemoveSlide(i) {
    if (pptSlides.length <= 1) return showToast('Precisas de pelo menos 1 slide', 'error');
    pptSlides.splice(i, 1);
    if (pptNotes[i]) delete pptNotes[i];
    pptCurrentIdx = Math.min(pptCurrentIdx, pptSlides.length - 1);
    pptRenderSidebar(); pptRenderSlide();
}
function pptDuplicateSlide(i) {
    const s = pptSlides[i];
    pptSlides.splice(i + 1, 0, { ...s, objects: s.objects ? s.objects.map(o => ({...o})) : [] });
    if (pptNotes[i]) pptNotes[i + 1] = pptNotes[i];
    pptCurrentIdx = i + 1;
    pptRenderSidebar(); pptRenderSlide();
}
function pptUpdateTitle(text) { if (pptSlides[pptCurrentIdx]) pptSlides[pptCurrentIdx].title = text; pptRenderSidebar(); }
function pptUpdateContent(html) { if (pptSlides[pptCurrentIdx]) { pptSlides[pptCurrentIdx].content = html; } }

function pptSetBG(type, val) {
    if (!pptSlides[pptCurrentIdx]) return;
    if (type === 'color') pptSlides[pptCurrentIdx].bg = val;
    else if (type === 'gradient' && val) pptSlides[pptCurrentIdx].bg = val;
    else if (type === 'image' && val) pptSlides[pptCurrentIdx].bg = 'url(' + val + ') center/cover no-repeat';
    pptRenderSlide();
}

function pptSetTransition(val) { pptTransition = val; }

function pptAddTextBox() {
    const s = pptSlides[pptCurrentIdx];
    if (!s) return;
    if (!s.objects) s.objects = [];
    s.objects.push({ type: 'text', x: 50, y: 50, w: 200, content: 'Novo texto', fontSize: 20, color: '#ffffff', bold: false, italic: false, align: 'left' });
    pptRenderSlide();
}

function pptAddImage() {
    const url = prompt('URL da imagem:', 'https://');
    if (!url) return;
    const s = pptSlides[pptCurrentIdx];
    if (!s) return;
    if (!s.objects) s.objects = [];
    s.objects.push({ type: 'image', x: 50, y: 50, w: 200, h: 150, src: url });
    pptRenderSlide();
}

function pptEditObject(idx) {
    const s = pptSlides[pptCurrentIdx];
    if (!s || !s.objects || !s.objects[idx]) return;
    const obj = s.objects[idx];
    if (obj.type === 'text') {
        const newContent = prompt('Texto:', obj.content);
        if (newContent !== null) obj.content = newContent;
        const newSize = prompt('Tamanho (px):', obj.fontSize);
        if (newSize !== null) obj.fontSize = parseInt(newSize) || obj.fontSize;
        const newColor = prompt('Cor (hex):', obj.color);
        if (newColor !== null) obj.color = newColor;
    } else if (obj.type === 'image') {
        const newSrc = prompt('URL da imagem:', obj.src);
        if (newSrc !== null) obj.src = newSrc;
    }
    pptRenderSlide();
}

function pptSaveNotes(val) { pptNotes[pptCurrentIdx] = val; }

function pptStartPresentation() {
    if (pptSlides.length === 0) return;
    pptInPresentation = true;
    const overlay = document.createElement('div');
    overlay.id = 'ppt-presentation-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#000;display:flex;flex-direction:column;';
    const slideContainer = document.createElement('div');
    slideContainer.id = 'ppt-presentation-slide';
    slideContainer.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;padding:40px;';
    overlay.appendChild(slideContainer);
    const controls = document.createElement('div');
    controls.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:10;';
    controls.innerHTML = `
        <button class="btn btn-sm btn-outline" id="ppt-pres-prev" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.2);">◀ Anterior</button>
        <span style="color:#fff;font-size:13px;padding:8px 12px;background:rgba(0,0,0,0.5);border-radius:8px;" id="ppt-pres-counter">Slide 1 / ${pptSlides.length}</span>
        <button class="btn btn-sm btn-outline" id="ppt-pres-next" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.2);">Seguinte ▶</button>
        <button class="btn btn-sm btn-danger" id="ppt-pres-exit" style="background:rgba(239,68,68,0.3);color:#fff;border-color:var(--danger);">✕ Sair</button>
    `;
    overlay.appendChild(controls);

    const notesDisplay = document.createElement('div');
    notesDisplay.id = 'ppt-pres-notes';
    notesDisplay.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.5);font-size:14px;text-align:center;max-width:600px;padding:8px 16px;background:rgba(0,0,0,0.4);border-radius:8px;display:none;';
    overlay.appendChild(notesDisplay);

    // Laser pointer canvas
    const laserCanvas = document.createElement('canvas');
    laserCanvas.id = 'ppt-laser-canvas';
    laserCanvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;cursor:none;';
    laserCanvas.width = window.innerWidth;
    laserCanvas.height = window.innerHeight;
    overlay.appendChild(laserCanvas);

    // Drawing canvas
    const drawCanvas = document.createElement('canvas');
    drawCanvas.id = 'ppt-draw-canvas';
    drawCanvas.style.cssText = 'position:fixed;inset:0;z-index:99997;cursor:crosshair;';
    drawCanvas.width = window.innerWidth;
    drawCanvas.height = window.innerHeight;
    overlay.appendChild(drawCanvas);

    document.body.appendChild(overlay);

    let presIdx = 0;
    let isDrawing = false;
    let drawToolPres = 'pen';
    const lctx = laserCanvas.getContext('2d');
    const dctx = drawCanvas.getContext('2d');

    function renderPresSlide(idx) {
        const s = pptSlides[idx];
        if (!s) return;
        const container = document.getElementById('ppt-presentation-slide');
        const counter = document.getElementById('ppt-pres-counter');
        const notesEl = document.getElementById('ppt-pres-notes');
        if (counter) counter.textContent = `Slide ${idx + 1} / ${pptSlides.length}`;
        if (notesEl) {
            const note = pptNotes[idx];
            notesEl.textContent = note || '';
            notesEl.style.display = note ? 'block' : 'none';
        }
        if (!container) return;
        const bgStyle = s.bg || '#0F172A';
        let objectsHtml = '';
        if (s.objects && s.objects.length > 0) {
            objectsHtml = s.objects.map(obj => {
                let style = `position:absolute;left:${obj.x || 0}px;top:${obj.y || 0}px;width:${obj.w || 200}px;`;
                if (obj.type === 'text') {
                    style += `font-size:${obj.fontSize || 20}px;color:${obj.color || '#fff'};font-weight:${obj.bold ? 'bold' : 'normal'};font-style:${obj.italic ? 'italic' : 'normal'};text-align:${obj.align || 'left'};`;
                    return `<div style="${style}">${escapeHTML(obj.content || 'Texto')}</div>`;
                } else if (obj.type === 'image') {
                    return `<img src="${escapeHTML(obj.src || '')}" style="${style}height:${obj.h || 150}px;object-fit:contain;border-radius:4px;"/>`;
                }
                return '';
            }).join('');
        }
        let transStyle = '';
        if (pptTransition === 'fade') transStyle = 'animation:fadeIn 0.5s ease;';
        else if (pptTransition === 'slide') transStyle = 'animation:slideInRight 0.5s ease;';
        else if (pptTransition === 'zoom') transStyle = 'animation:scaleIn 0.5s ease;';
        container.innerHTML = `
            <div style="width:90%;max-width:1100px;aspect-ratio:16/9;background:${bgStyle};border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px;position:relative;color:#fff;${transStyle}">
                ${objectsHtml}
                <h1 style="font-size:56px;font-weight:900;margin-bottom:20px;">${escapeHTML(s.title)}</h1>
                <p style="font-size:26px;opacity:0.8;max-width:700px;line-height:1.5;">${s.content}</p>
            </div>
        `;
    }

    renderPresSlide(0);

    // Laser pointer
    let laserOn = false;
    laserCanvas.addEventListener('mousemove', function(e) {
        lctx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
        if (laserOn) {
            lctx.beginPath();
            lctx.arc(e.clientX, e.clientY, 6, 0, Math.PI * 2);
            lctx.fillStyle = 'rgba(255,50,50,0.9)';
            lctx.fill();
            lctx.beginPath();
            lctx.arc(e.clientX, e.clientY, 12, 0, Math.PI * 2);
            lctx.fillStyle = 'rgba(255,50,50,0.2)';
            lctx.fill();
        }
    });

    document.addEventListener('keydown', function presKeydown(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            if (presIdx < pptSlides.length - 1) { presIdx++; dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); renderPresSlide(presIdx); }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (presIdx > 0) { presIdx--; dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); renderPresSlide(presIdx); }
        } else if (e.key === 'Escape') {
            pptExitPresentation();
        } else if (e.key === 'l' || e.key === 'L') {
            laserOn = !laserOn;
            if (!laserOn) lctx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
        } else if (e.key === 'p' || e.key === 'P') {
            drawToolPres = 'pen';
            drawCanvas.style.cursor = 'crosshair';
        } else if (e.key === 'e' || e.key === 'E') {
            drawToolPres = 'eraser';
            drawCanvas.style.cursor = 'pointer';
        } else if (e.key === 'h' || e.key === 'H') {
            drawToolPres = 'highlighter';
            drawCanvas.style.cursor = 'crosshair';
        } else if (e.key === 'c' || e.key === 'C') {
            dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        }
    });

    overlay.addEventListener('click', function(e) {
        if (e.target.closest('#ppt-pres-prev') || e.target.closest('#ppt-pres-next') || e.target.closest('#ppt-pres-exit')) return;
        if (e.target.closest('#ppt-pres-notes')) return;
        if (presIdx < pptSlides.length - 1) { presIdx++; dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); renderPresSlide(presIdx); }
    });

    document.getElementById('ppt-pres-prev').onclick = function() { if (presIdx > 0) { presIdx--; dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); renderPresSlide(presIdx); } };
    document.getElementById('ppt-pres-next').onclick = function() { if (presIdx < pptSlides.length - 1) { presIdx++; dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); renderPresSlide(presIdx); } };
    document.getElementById('ppt-pres-exit').onclick = pptExitPresentation;

    // Drawing overlay
    let drawPoints = [];
    drawCanvas.onpointerdown = function(e) {
        isDrawing = true;
        drawPoints = [{ x: e.clientX, y: e.clientY, p: e.pressure || 0.5 }];
        dctx.beginPath();
        dctx.moveTo(e.clientX, e.clientY);
    };
    drawCanvas.onpointermove = function(e) {
        if (!isDrawing) return;
        drawPoints.push({ x: e.clientX, y: e.clientY, p: e.pressure || 0.5 });
        if (drawToolPres === 'eraser') {
            dctx.globalCompositeOperation = 'destination-out';
            dctx.strokeStyle = 'rgba(0,0,0,1)';
            dctx.lineWidth = 30;
        } else if (drawToolPres === 'highlighter') {
            dctx.globalCompositeOperation = 'source-over';
            dctx.strokeStyle = 'rgba(255,255,0,0.3)';
            dctx.lineWidth = 20;
        } else {
            dctx.globalCompositeOperation = 'source-over';
            dctx.strokeStyle = '#FF0000';
            dctx.lineWidth = 3;
        }
        dctx.lineCap = 'round';
        dctx.lineJoin = 'round';
        dctx.lineTo(e.clientX, e.clientY);
        dctx.stroke();
    };
    drawCanvas.onpointerup = function() { isDrawing = false; dctx.globalCompositeOperation = 'source-over'; };
    drawCanvas.onpointerleave = function() { isDrawing = false; dctx.globalCompositeOperation = 'source-over'; };
}

function pptExitPresentation() {
    const overlay = document.getElementById('ppt-presentation-overlay');
    if (overlay) overlay.remove();
    pptInPresentation = false;
}

async function pptSave() {
    const nome = prompt('Nome da apresentação:', window._pptName || 'Apresentação');
    if (!nome) return;
    window._pptName = nome;
    const ref = window._pptKey ? db.ref('ppt_presentations/' + window._pptKey) : db.ref('ppt_presentations').push();
    window._pptKey = ref.key || window._pptKey;
    await ref.set({ nome, slides: pptSlides, notes: pptNotes, transition: pptTransition, autorId: currentUser.uid, autorNome: userProfile?.nome, updatedAt: Date.now(), createdAt: window._pptCreatedAt || Date.now() });
    showToast('Guardado!', 'success');
}

async function pptLoad() {
    const snap = await dbGet('ppt_presentations');
    const ppts = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (ppts.length === 0) return showToast('Sem apresentações', 'error');
    const choice = prompt('Apresentações:\n' + ppts.map((p,i) => `${i+1}. ${p.nome} (${p.slides?.length || 0} slides)`).join('\n') + '\n\nNúmero:');
    const p = ppts[parseInt(choice) - 1];
    if (p && p.slides) {
        pptSlides = p.slides;
        pptNotes = p.notes || {};
        pptTransition = p.transition || 'none';
        window._pptKey = p.id;
        window._pptName = p.nome;
        window._pptCreatedAt = p.createdAt;
        pptCurrentIdx = 0;
        const selectEl = document.querySelector('select[onchange*="pptSetTransition"]');
        if (selectEl) selectEl.value = pptTransition;
        pptRenderSidebar();
        pptRenderSlide();
        showToast('Carregado!', 'success');
    }
}

// Cleanup
const _origRenderPP = window.renderPowerpoint;
window.renderPowerpoint = function(area) {
    if (pptInPresentation) pptExitPresentation();
    _origRenderPP(area);
};
