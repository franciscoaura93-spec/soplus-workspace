// S&O+ Extension: Cadernos — Cadernos de escrita com flip de páginas

(function ensurePageFlip() {
    if (typeof StPageFlip !== 'undefined' || document.querySelector('script[data-cadernos-pageflip]')) return;
    const s = document.createElement('script');
    s.setAttribute('data-cadernos-pageflip', '1');
    s.src = '/static/js/vendor/page-flip.browser.js';
    s.onerror = function() {
        const f = document.createElement('script');
        f.setAttribute('data-cadernos-pageflip', '1');
        f.src = 'https://unpkg.com/page-flip/dist/js/page-flip.browser.js';
        document.head.appendChild(f);
    };
    document.head.appendChild(s);
})();

const CN = {
    notebooks: [],
    activeId: null,
    activeNotebook: null,
    currentPage: 0,
    currentView: 'list',
    pageFlip: null,
    flipMode: 'singlePage',
    drawing: false,
    lastX: 0,
    lastY: 0,
    currentTool: 'navigate',
    currentColor: '#2563EB',
    currentWidth: 3,
    writeRow: 0,
    writeBlocked: false,
    writeMaxChars: 0,
    writeCharW: 0,
    CACHE_KEY: 'soplus_cadernos',
    aiModal: null,
    tablesEnabled: true,
    treesEnabled: true,
    graphsEnabled: true,
    customColors: ['#2563EB', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#22C55E', '#f8fafc', '#1E293B']
};

(function cnInjectPaperCSS() {
    if (document.querySelector('#cn-paper-style')) return;
    const st = document.createElement('style');
    st.id = 'cn-paper-style';
    st.textContent = `
        #cn-flip-book .cn-page {
            font-family: 'Inter', system-ui, sans-serif;
        }
        .cn-page { box-shadow: inset 0 0 30px rgba(80,60,20,0.06); }
        .cn-page[data-side="left"] { border-radius: 6px 0 0 6px; }
        .cn-page[data-side="right"] { border-radius: 0 6px 6px 0; }
        .cn-page.cn-paper-blank { background-image: radial-gradient(rgba(90,70,30,0.025) 1px, transparent 1.2px); background-size: 4px 4px; }
        .cn-page::after {
            content: ''; position: absolute; top: 0; bottom: 0; pointer-events: none; z-index: 1;
        }
        .cn-page[data-side="left"]::after { right: -1px; width: 14px; background: linear-gradient(to left, rgba(0,0,0,0.10), transparent); }
        .cn-page[data-side="right"]::after { left: -1px; width: 14px; background: linear-gradient(to right, rgba(0,0,0,0.10), transparent); }
        .stf__parent { position: relative; display: block; box-sizing: border-box; transform: translateZ(0); -ms-touch-action: pan-y; touch-action: pan-y; }
        .stf__wrapper, .sft__wrapper { position: relative; width: 100%; box-sizing: border-box; }
        .stf__parent canvas { position: absolute; width: 100%; height: 100%; left: 0; top: 0; }
        .stf__block { position: absolute; width: 100%; height: 100%; box-sizing: border-box; perspective: 2000px; }
        .stf__item { display: none; position: absolute; transform-style: preserve-3d; }
        .stf__outerShadow, .stf__innerShadow, .stf__hardShadow, .stf__hardInnerShadow { position: absolute; left: 0; top: 0; }
        #cn-flip-book { user-select: none; touch-action: pan-y; }
        #cn-flip-wrap { max-width: 880px; }
        #cn-flip-book { width: 100%; height: auto; aspect-ratio: 1.4148 / 1; max-width: min(880px, calc((100vh - 210px) * 1.4148)); margin: 0 auto; }
        .cn-caret { display: inline-block; width: 2px; height: 20px; background: #334155; vertical-align: middle; margin-left: 1px; animation: cnCaretBlink 1s steps(1) infinite; }
        @keyframes cnCaretBlink { 50% { opacity: 0; } }
    `;
    document.head.appendChild(st);
})();

function cnLoad() {
    try {
        const raw = localStorage.getItem(CN.CACHE_KEY) || '[]';
        CN.notebooks = JSON.parse(raw);
    } catch (e) {
        CN.notebooks = [];
    }
}

function cnSave() {
    try {
        localStorage.setItem(CN.CACHE_KEY, JSON.stringify(CN.notebooks));
    } catch (e) {
        console.warn('Cadernos: erro a guardar', e);
    }
}

function renderCadernos(area) {
    cnLoad();
    CN.activeId = null;
    CN.activeNotebook = null;
    CN.currentView = 'list';
    area.innerHTML = `
        <div class="page-header"><h2>📓 Cadernos</h2><p>Os teus cadernos de escrita personalizados</p></div>
        <div id="cn-shell"></div>
    `;
    cnRenderList(area);
}

window.renderCadernos = renderCadernos;

function cnRenderList(area) {
    CN.currentView = 'list';
    const shell = document.getElementById('cn-shell');
    if (!shell) return;
    const hasNotebooks = CN.notebooks.length > 0;
    shell.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
            <button class="btn btn-primary" onclick="cnCreateNotebook()">➕ Novo Caderno</button>
        </div>
        ${hasNotebooks ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
                ${CN.notebooks.map(nb => cnNotebookCard(nb)).join('')}
            </div>
        ` : `
            <div class="empty-state">
                <div class="icon">📓</div>
                <h3>Ainda não tens cadernos</h3>
                <p>Cria o teu primeiro caderno personalizado com linhas, quadriculado ou em branco.</p>
                <button class="btn btn-primary" onclick="cnCreateNotebook()" style="margin-top:16px;">➕ Criar Caderno</button>
            </div>
        `}
    `;
}

function cnNotebookCard(nb) {
    return `
        <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:22px;cursor:pointer;" onclick="cnOpenNotebook('${nb.id}')">
            <div style="width:100%;height:120px;border-radius:12px;background:${nb.color || '#2563EB'};display:flex;align-items:center;justify-content:center;font-size:42px;margin-bottom:14px;box-shadow:var(--shadow-md);">
                ${nb.emoji || '📘'}
            </div>
            <div style="font-weight:700;font-size:15px;color:var(--text);text-align:center;">${cnEscape(nb.title || 'Sem título')}</div>
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">${nb.pages ? nb.pages.length : 0} páginas · ${nb.paper === 'grid' ? 'Quadriculado' : nb.paper === 'blank' ? 'Branco' : 'Linhas'}</div>
            <div style="display:flex;gap:8px;margin-top:14px;width:100%;" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline" style="flex:1;" onclick="cnOpenNotebook('${nb.id}')">📖 Abrir</button>
                <button class="btn btn-sm btn-ghost" onclick="cnEditNotebook('${nb.id}')">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="cnDeleteNotebook('${nb.id}')">🗑️</button>
            </div>
        </div>
    `;
}

function cnEscape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cnCreateNotebook() {
    const defaultTemplate = {
        id: 'nb_' + Date.now(),
        title: 'Novo Caderno',
        color: '#2563EB',
        emoji: '📘',
        paper: 'lines',
        lineColor: '#2563EB',
        pages: []
    };
    cnOpenEditor(defaultTemplate, true);
}

function cnEditNotebook(id) {
    const nb = CN.notebooks.find(n => n.id === id);
    if (!nb) return;
    CN.activeId = id;
    cnOpenEditor(nb, false);
}

function cnOpenEditor(nb, isNew) {
    const shell = document.getElementById('cn-shell');
    if (!shell) return;
    shell.innerHTML = `
        <div class="card" style="max-width:700px;margin:0 auto;">
            <div class="card-title">${isNew ? '➕' : '✏️'} ${isNew ? 'Criar' : 'Editar'} Caderno</div>
            <div style="display:grid;grid-template-columns:1fr 100px;gap:12px;margin-bottom:14px;">
                <div class="form-group" style="margin-bottom:8px;">
                    <label>Título</label>
                    <input type="text" id="cn-ed-title" class="form-input" value="${cnEscape(nb.title)}" placeholder="Ex.: Biologia">
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label>Emoji</label>
                    <input type="text" id="cn-ed-emoji" class="form-input" value="${cnEscape(nb.emoji || '📘')}" style="text-align:center;" maxlength="4">
                </div>
            </div>
            <div class="form-group">
                <label>Tipo de papel</label>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                    ${['lines', 'grid', 'blank'].map(t => {
                        const labels = { lines: '✏️ Linhas', grid: '🔲 Quadriculado', blank: '⬜ Branco' };
                        return `<button class="btn ${nb.paper === t ? 'btn-primary' : 'btn-ghost'}" id="cn-ed-paper-${t}" onclick="cnEditorPaper('${t}')" style="justify-content:center;">${labels[t]}</button>`;
                    }).join('')}
                </div>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
                <label>Cor</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${CN.customColors.map(c => `
                        <div onclick="cnEditorColor('${c}')" id="cn-ed-color-${c.replace('#','')}" style="width:34px;height:34px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c};box-shadow:${nb.color === c ? '0 0 0 3px var(--bg),0 0 0 4px ' + c : 'var(--shadow-sm)'};"></div>
                    `).join('')}
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;">
                <button class="btn btn-primary" style="flex:1;" onclick="cnEditorSave(${isNew})">💾 Guardar</button>
                <button class="btn btn-ghost" onclick="cnRenderList(document.getElementById('content-area'))">Cancelar</button>
            </div>
        </div>
    `;
}

function cnEditorPaper(type) {
    ['lines','grid','blank'].forEach(t => {
        const b = document.getElementById('cn-ed-paper-' + t);
        if (b) b.className = 'btn ' + (t === type ? 'btn-primary' : 'btn-ghost');
    });
}

function cnEditorColor(c) {
    const cb = document.getElementById('cn-ed-color-' + c.replace('#',''));
    if (!cb) return;
    document.querySelectorAll('[id^="cn-ed-color-"]').forEach(el => {
        const col = '#' + el.id.split('cn-ed-color-')[1];
        el.style.boxShadow = el === cb ? '0 0 0 3px var(--bg),0 0 0 4px ' + col : 'var(--shadow-sm)';
    });
}

function cnEditorSave(isNew) {
    const title = document.getElementById('cn-ed-title').value.trim() || 'Sem título';
    const emoji = document.getElementById('cn-ed-emoji').value.trim() || '📘';
    let color = '#2563EB';
    document.querySelectorAll('[id^="cn-ed-color-"]').forEach(el => {
        if (el.style.boxShadow.includes('0 0 0 3px var(--bg),0 0 0 4px')) color = '#' + el.id.split('cn-ed-color-')[1];
    });
    let paper = 'lines';
    if (document.getElementById('cn-ed-paper-grid')?.className.includes('btn-primary')) paper = 'grid';
    if (document.getElementById('cn-ed-paper-blank')?.className.includes('btn-primary')) paper = 'blank';

    if (isNew) {
        const nb = { id: 'nb_' + Date.now(), title, color, emoji, paper, pages: cnNewPage() };
        CN.notebooks.push(nb);
    } else {
        const nb = CN.notebooks.find(n => n.id === CN.activeId);
        if (nb) { nb.title = title; nb.color = color; nb.emoji = emoji; nb.paper = paper; }
    }
    cnSave();
    cnRenderList(document.getElementById('content-area'));
}

function cnNewPage() {
    const t0 = Date.now();
    return [
        { id: 'pg_' + t0, strokes: [], elements: [], bg: null },
        { id: 'pg_' + (t0 + 1), strokes: [], elements: [], bg: null }
    ];
}

function cnOpenNotebook(id) {
    const nb = CN.notebooks.find(n => n.id === id);
    if (!nb) return;
    CN.activeId = id;
    CN.activeNotebook = nb;
    CN.currentPage = 0;
    CN.currentView = 'notebook';
    CN.writeRow = 0;
    CN.writeBlocked = false;
    CN.writeMaxChars = 0;
    CN.writeCharW = 0;
    if (!nb.pages || nb.pages.length === 0) nb.pages = cnNewPage();
    else if (nb.pages.length === 1) nb.pages.push({ id: 'pg_' + Date.now(), strokes: [], elements: [], bg: null });
    cnRenderNotebook();
}

function cnDeleteNotebook(id) {
    const nb = CN.notebooks.find(n => n.id === id);
    if (!nb) return;
    if (!confirm('Apagar o caderno "' + nb.title + '"? Esta ação não pode ser revertida.')) return;
    CN.notebooks = CN.notebooks.filter(n => n.id !== id);
    cnSave();
    cnRenderList(document.getElementById('content-area'));
}

function cnRenderNotebook() {
    const shell = document.getElementById('cn-shell');
    if (!shell) return;
    const nb = CN.activeNotebook;
    if (!nb) return;
    shell.innerHTML = cnNotebookNavHTML(nb) + `
        <div id="cn-toolbar"></div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button class="btn btn-sm btn-outline" onclick="cnOpenElementsMenu()">🧩 Tabelas</button>
            <button class="btn btn-sm btn-outline" onclick="cnOpenElementsMenu()">🌳 Árvores</button>
            <button class="btn btn-sm btn-outline" onclick="cnOpenElementsMenu()">📊 Gráficos</button>
        </div>
        <div id="cn-flip-wrap" style="position:relative;width:100%;margin:0 auto;overflow:hidden;">
            <div id="cn-flip-book" style="position:relative;width:100%;aspect-ratio:1.4148/1;max-width:min(880px,calc((100vh - 210px) * 1.4148));margin:0 auto;">
                ${nb.pages.map((pg, idx) => cnPageHtml(pg, idx)).join('')}
            </div>
        </div>
    `;
    cnRenderToolbar();
    cnInitFlip();
    cnRenderWritingAll();
}

function cnNotebookNavHTML(nb) {
    return `
        <div id="cn-nav" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <button class="btn btn-ghost btn-sm" onclick="cnRenderList(document.getElementById('content-area'))">← Cadernos</button>
                <div style="font-size:22px;">${cnEscape(nb.emoji || '📘')}</div>
                <div style="font-weight:700;font-size:18px;">${cnEscape(nb.title)}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-ai" onclick="cnOpenAI()">✨ Resumir IA</button>
                <button class="btn btn-sm btn-outline" onclick="cnAddPage()">➕ Página</button>
                <button class="btn btn-sm btn-ghost" onclick="cnDeletePage()">🗑️ Pág.</button>
            </div>
        </div>
    `;
}

function cnPageHtml(pg, idx) {
    const nb = CN.activeNotebook;
    const paperType = nb.paper === 'grid' ? 'grid' : nb.paper === 'blank' ? 'blank' : 'lines';
    const paper = cnPaperCSS(paperType);
    return `
        <div class="cn-page cn-paper-${paperType}" data-cn-page="${idx}" data-side="${idx % 2 === 1 ? 'left' : 'right'}" style="${paper} position:relative;overflow:hidden;padding:0;box-sizing:border-box;">
            <div class="cn-writing-layer" data-writing-page="${idx}" style="position:absolute;top:14px;left:52px;right:20px;bottom:16px;overflow:hidden;pointer-events:none;z-index:1;"></div>
            <canvas class="cn-canvas" data-canvas-page="${idx}" style="position:absolute;top:0;left:0;width:100%;height:100%;touch-action:none;z-index:2;"></canvas>
            <div class="cn-element-layer" data-element-page="${idx}" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:3;"></div>
        </div>
    `;
}

function cnPaperCSS(type) {
    const base = 'background-color:#fbfaf6;box-shadow:inset 0 0 28px rgba(80,60,20,0.07), inset 1px 0 3px rgba(0,0,0,0.04);';
    if (type === 'grid') {
        return base + cnPaperGridCSS();
    }
    if (type === 'blank') {
        return base;
    }
    return base + cnPaperLinesCSS();
}

function cnPaperGridCSS() {
    return `background-image:linear-gradient(rgba(99,102,241,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.18) 1px,transparent 1px);background-size:23px 23px;`;
}

function cnPaperLinesCSS() {
    return `background-image:linear-gradient(90deg,transparent 39px,rgba(220,60,90,0.45) 39px,rgba(220,60,90,0.45) 40px,transparent 40px),repeating-linear-gradient(transparent,transparent 33px,rgba(80,75,150,0.5) 33px,rgba(80,75,150,0.5) 34px);background-position:0 0,0 14px;`;
}

function cnInitFlip() {
    const book = document.getElementById('cn-flip-book');
    if (!book) return;
    if (typeof StPageFlip === 'undefined') {
        console.warn('Cadernos: StPageFlip a carregar, a aguardar…');
        let tries = 0;
        (function waitFlip() {
            tries++;
            if (typeof StPageFlip !== 'undefined') { cnStartFlip(); return; }
            if (tries > 20) {
                console.warn('Cadernos: StPageFlip indisponível, a usar modo estático.');
                cnStaticFlip(book);
                return;
            }
            setTimeout(waitFlip, 100);
        })();
        return;
    }
    cnStartFlip();
}

function cnStaticFlip(book) {
    const pages = book.querySelectorAll('.cn-page');
    pages.forEach((pg, i) => {
        pg.style.position = 'relative';
        pg.style.width = '100%';
        pg.style.height = '600px';
        pg.style.marginBottom = '16px';
        pg.style.display = i === 0 ? 'block' : 'none';
    });
    const first = pages[0];
    if (first) {
        const prevBtn = '<button class="btn btn-sm btn-outline" onclick="cnFlipStatic(-1)">← Pág. anterior</button>';
        const nextBtn = '<button class="btn btn-sm btn-outline" onclick="cnFlipStatic(1)">Página seguinte →</button>';
        const nav = document.createElement('div');
        nav.style.cssText = 'display:flex;justify-content:center;gap:10px;margin:12px 0;';
        nav.innerHTML = prevBtn + ' <span id="cn-static-page" style="align-self:center;font-size:13px;color:var(--text-light);"></span> ' + nextBtn;
        first.parentNode.insertBefore(nav, first);
        cnFlipStatic(0);
    }
    cnSetupCanvasEvents();
    cnRenderWritingAll();
}

function cnStartFlip() {
    const book = document.getElementById('cn-flip-book');
    if (!book) return;
    try {
        if (CN.pageFlip) { try { CN.pageFlip.destroy(); } catch(e){} CN.pageFlip = null; }
        CN.pageFlip = new StPageFlip(book, {
            width: 440,
            height: 622,
            size: 'stretch',
            minWidth: 320,
            maxWidth: 460,
            minHeight: 450,
            maxHeight: 650,
            drawShadow: true,
            flippingTime: 650,
            maxShadowOpacity: 0.5,
            showCover: false,
            usePortrait: false,
            autoSize: true,
            startPage: CN.currentPage || 0,
            mobileScrollSupport: false,
            swipeDistance: 20,
            clickEventForward: true
        });
        CN.pageFlip.loadFromHTML(document.querySelectorAll('.cn-page'));
        if (CN.pageFlip.on) {
            CN.pageFlip.on('flip', e => {
                let i = parseInt(e.data);
                if (isNaN(i)) i = 0;
                if (CN.activeNotebook) i = Math.max(0, Math.min(CN.activeNotebook.pages.length - 1, i));
                CN.currentPage = i;
                cnRefreshPageNav();
                cnRenderWriting(CN.currentPage);
            });
        }
        setTimeout(() => CN.pageFlip.update(), 50);
        setTimeout(() => cnDrawAllPages(), 100);
        setTimeout(() => cnRestoreElements(), 120);
        setTimeout(() => cnRenderWritingAll(), 140);
    } catch (e) {
        console.warn('Cadernos: erro pageflip', e);
        CN.pageFlip = null;
    }
    cnSetupCanvasEvents();
}

function cnFlipStatic(dir) {
    const book = document.getElementById('cn-flip-book');
    if (!book) return;
    const pages = book.querySelectorAll('.cn-page');
    if (!pages.length) return;
    let idx = 0;
    for (let i = 0; i < pages.length; i++) { if (pages[i].style.display !== 'none') { idx = i; break; } }
    if (dir === 0) idx = CN.currentPage || 0;
    else idx = Math.max(0, Math.min(pages.length - 1, idx + dir));
    pages.forEach((pg, i) => { pg.style.display = (i === idx) ? 'block' : 'none'; });
    const lbl = document.getElementById('cn-static-page');
    if (lbl) lbl.textContent = `Página ${idx + 1} de ${pages.length}`;
    CN.currentPage = idx;
    cnDrawAllPages();
    cnRestoreElements();
    cnRenderWriting(idx);
    cnSetupCanvasEvents();
}

function cnRestoreElements() {
    const nb = CN.activeNotebook;
    if (!nb) return;
    (nb.pages || []).forEach((pg, i) => {
        const layer = document.querySelector(`.cn-element-layer[data-element-page="${i}"]`);
        if (!layer || !pg.elements) return;
        layer.innerHTML = '';
        pg.elements.forEach((elData, i) => cnRenderPageElement(layer, elData, i));
    });
}

function cnRefreshPageNav() {
    const nb = CN.activeNotebook;
    if (!nb) return;
    const info = document.getElementById('cn-page-info');
    if (info) info.textContent = (CN.currentPage + 1) + ' / ' + nb.pages.length;
}

function cnAddPage() {
    const nb = CN.activeNotebook;
    if (!nb) return;
    nb.pages.push({ id: 'pg_' + Date.now(), strokes: [], elements: [] });
    cnSave();
    CN.currentPage = nb.pages.length - 1;
    cnRenderNotebook();
}

function cnDeletePage() {
    const nb = CN.activeNotebook;
    if (!nb) return;
    if (nb.pages.length <= 1) { alert('Não podes apagar a única página.'); return; }
    nb.pages.splice(CN.currentPage >= nb.pages.length ? nb.pages.length - 1 : CN.currentPage, 1);
    if (CN.currentPage >= nb.pages.length) CN.currentPage = nb.pages.length - 1;
    cnSave();
    cnRenderNotebook();
}

function cnGetPage() {
    let p = CN.currentPage;
    if (p >= CN.activeNotebook.pages.length) p = CN.activeNotebook.pages.length - 1;
    return CN.activeNotebook.pages[p];
}

function cnSetupCanvasEvents() {
    document.querySelectorAll('.cn-canvas').forEach(canvas => {
        canvas.addEventListener('pointerdown', cnPointerDown);
        canvas.addEventListener('pointermove', cnPointerMove);
        canvas.addEventListener('pointerup', cnPointerUp);
        canvas.addEventListener('pointercancel', cnPointerUp);
    });
}

function cnCanvasForPage(pageIdx) {
    return document.querySelector(`.cn-canvas[data-canvas-page="${pageIdx}"]`);
}

function cnPointerDown(e) {
    const canvas = e.target.closest('.cn-canvas');
    if (!canvas || CN.currentTool === 'navigate' || CN.currentTool === 'write') { CN.drawing = false; return; }
    CN.drawing = true;
    CN.lastX = cnX(e, canvas);
    CN.lastY = cnY(e, canvas);
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
}

function cnPointerMove(e) {
    if (!CN.drawing) return;
    const canvas = e.target.closest('.cn-canvas');
    if (!canvas) return;
    const x = cnX(e, canvas);
    const y = cnY(e, canvas);
    const pg = cnGetPage();
    pg.strokes.push({ tool: CN.currentTool, color: CN.currentColor, width: CN.currentWidth, x: CN.lastX, y: CN.lastY, toX: x, toY: y });
    CN.lastX = x; CN.lastY = y;
    cnDrawPage(canvas);
    e.preventDefault();
}

function cnPointerUp(e) {
    CN.drawing = false;
    cnSave();
}

function cnX(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * 100; // percentage
}

function cnY(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return ((e.clientY - rect.top) / rect.height) * 100;
}

function cnDrawPage(canvas) {
    const pageIdx = canvas.getAttribute('data-canvas-page');
    const pg = CN.activeNotebook.pages[pageIdx];
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const w = rect.width, h = rect.height;
    if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) {
        canvas.width = Math.round(w * (window.devicePixelRatio || 1));
        canvas.height = Math.round(h * (window.devicePixelRatio || 1));
        const ctx0 = canvas.getContext('2d');
        ctx0.setTransform((window.devicePixelRatio || 1), 0, 0, (window.devicePixelRatio || 1), 0, 0);
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (!pg.strokes) return;
    for (const s of pg.strokes) {
        ctx.save();
        if (s.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = (s.width || 3) * 6 + 6;
        } else {
            if (s.tool === 'highlighter') {
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = (s.width || 3) * 4 + 8;
            } else {
                ctx.lineWidth = s.width;
            }
            ctx.strokeStyle = s.color;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x * w / 100, s.y * h / 100);
        ctx.lineTo(s.toX * w / 100, s.toY * h / 100);
        ctx.stroke();
        ctx.restore();
    }
}

function cnDrawAllPages() {
    document.querySelectorAll('.cn-canvas').forEach(canvas => cnDrawPage(canvas));
}

// ---------------- Escrita nas linhas ----------------
function cnWriteCharWidth() {
    if (CN.writeCharW) return CN.writeCharW;
    const span = document.createElement('span');
    span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:21px;font-family:Inter,system-ui,sans-serif;';
    span.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!? ';
    document.body.appendChild(span);
    CN.writeCharW = span.getBoundingClientRect().width / span.textContent.length;
    span.remove();
    return CN.writeCharW;
}

function cnWriteRowCount(h) {
    if (!h || h < 120) h = 600;
    return Math.max(4, Math.floor((h - 14 - 16) / 34));
}

function cnWriteRowsFor(pageIdx) {
    const canvas = document.querySelector(`.cn-canvas[data-canvas-page="${pageIdx}"]`);
    return cnWriteRowCount(canvas ? canvas.getBoundingClientRect().height : 600);
}

function cnWriteMaxCharsFor(pageIdx) {
    const canvas = document.querySelector(`.cn-canvas[data-canvas-page="${pageIdx}"]`);
    let w = canvas ? canvas.getBoundingClientRect().width : 440;
    if (!w || w < 100) w = 440;
    const usable = w - 52 - 20 - 6;
    return Math.max(10, Math.floor(usable / cnWriteCharWidth()));
}

function cnRenderWriting(pageIdx) {
    const layer = document.querySelector(`.cn-writing-layer[data-writing-page="${pageIdx}"]`);
    if (!layer) return;
    const pg = CN.activeNotebook && CN.activeNotebook.pages[pageIdx];
    if (!pg) return;
    const rows = cnWriteRowsFor(pageIdx);
    const writing = Array.isArray(pg.writing) ? pg.writing : [];
    let html = '';
    for (let r = 0; r < rows; r++) {
        const txt = (writing[r] || '');
        const isCur = (r === CN.writeRow && pageIdx === CN.currentPage && CN.currentTool === 'write');
        html += `<div style="height:34px;line-height:34px;white-space:nowrap;overflow:hidden;font-size:21px;color:#0f172a;">${cnEscape(txt)}${isCur ? '<span class="cn-caret"></span>' : ''}</div>`;
    }
    layer.innerHTML = html;
}

function cnRenderWritingAll() {
    const nb = CN.activeNotebook;
    if (!nb) return;
    (nb.pages || []).forEach((pg, i) => cnRenderWriting(i));
}

function cnWriteCurrentPage() {
    return CN.activeNotebook && CN.activeNotebook.pages[CN.currentPage];
}

function cnWriteInsert(ch) {
    const pg = cnWriteCurrentPage();
    if (!pg) return false;
    pg.writing = Array.isArray(pg.writing) ? pg.writing : [];
    pg.writing[CN.writeRow] = (pg.writing[CN.writeRow] || '') + ch;
    if (pg.writing[CN.writeRow].length > (CN.writeMaxChars || 40)) {
        const line = pg.writing[CN.writeRow];
        pg.writing[CN.writeRow] = line.slice(0, -1);
        if (!cnWriteToNextRow()) { pg.writing[CN.writeRow] = line; return true; }
        pg.writing[CN.writeRow] = (pg.writing[CN.writeRow] || '') + ch;
    }
    return true;
}

function cnWriteNewLine() {
    return cnWriteToNextRow();
}

function cnWriteBackspace() {
    const pg = cnWriteCurrentPage();
    if (!pg) return;
    pg.writing = Array.isArray(pg.writing) ? pg.writing : [];
    const row = pg.writing[CN.writeRow] || '';
    if (row.length) {
        pg.writing[CN.writeRow] = row.slice(0, -1);
        return;
    }
    if (CN.writeRow > 0) CN.writeRow--;
}

function cnWriteToNextRow() {
    const rows = cnWriteRowsFor(CN.currentPage);
    if (CN.writeRow + 1 >= rows) return cnWriteEndOfPage();
    CN.writeRow++;
    if (!CN.activeNotebook) return true;
    const pg = cnWriteCurrentPage();
    if (pg) { pg.writing = Array.isArray(pg.writing) ? pg.writing : []; if (!pg.writing[CN.writeRow]) pg.writing[CN.writeRow] = ''; }
    return true;
}

function cnWriteEndOfPage() {
    if (CN.writeBlocked) return false;
    CN.writeBlocked = true;
    const ok = window.confirm('Chegaste ao fim da página. Queres passar para a página seguinte?');
    CN.writeBlocked = false;
    if (ok) { cnWriteGoNextPage(); return true; }
    return false;
}

function cnWriteGoNextPage() {
    const nb = CN.activeNotebook;
    if (!nb) return;
    let target = CN.currentPage + 1;
    while (target >= nb.pages.length) nb.pages.push({ id: 'pg_' + Date.now(), strokes: [], elements: [], writing: [] });
    CN.writeRow = 0;
    CN.currentPage = target;
    cnSave();
    if (CN.pageFlip && typeof CN.pageFlip.turnToPage === 'function') {
        try {
            CN.pageFlip.turnToPage(target);
        } catch (e) {
            cnRenderNotebook();
        }
    } else {
        cnRenderNotebook();
    }
    cnRenderWriting(CN.currentPage);
}

function cnWriteKeydown(e) {
    if (CN.currentView !== 'notebook' || CN.currentTool !== 'write') return;
    if (CN.activeId == null) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (document.getElementById('cn-elements-modal') || document.getElementById('cn-ai-modal')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const pg = cnWriteCurrentPage();
    if (!pg) return;
    CN.writeMaxChars = cnWriteMaxCharsFor(CN.currentPage);
    e.preventDefault();
    if (e.key === 'Enter') {
        if (cnWriteNewLine()) { cnSave(); cnRenderWriting(CN.currentPage); }
        return;
    }
    if (e.key === 'Backspace') {
        cnWriteBackspace();
        cnSave();
        cnRenderWriting(CN.currentPage);
        return;
    }
    if (e.key === 'Tab') {
        cnWriteInsert('    ');
        cnSave();
        cnRenderWriting(CN.currentPage);
        return;
    }
    if (e.key.length === 1) {
        if (cnWriteInsert(e.key)) { cnSave(); cnRenderWriting(CN.currentPage); }
    }
}

if (!window.__cnKeydownBound) { document.addEventListener('keydown', cnWriteKeydown); window.__cnKeydownBound = true; }

function cnSetTool(tool) {
    CN.currentTool = tool;
    document.querySelectorAll('.cn-tool-btn').forEach(b => {
        b.classList.toggle('btn-primary', b.dataset.tool === tool);
        b.classList.toggle('btn-outline', b.dataset.tool !== tool);
    });
    cnRenderWriting(CN.currentPage);
}

function cnSetColor(c) {
    CN.currentColor = c;
    document.querySelectorAll('.cn-color-swatch').forEach(el => {
        el.style.boxShadow = el.dataset.color === c ? '0 0 0 2px var(--bg),0 0 0 4px ' + c : 'var(--shadow-sm)';
    });
}

function cnAddColorFromPicker() {
    const picker = document.getElementById('cn-custom-color');
    if (picker && picker.value && !CN.customColors.includes(picker.value)) CN.customColors.push(picker.value);
    const swatches = document.getElementById('cn-color-row');
    if (swatches) swatches.innerHTML = cnColorSwatches();
}

function cnClearPage() {
    const pg = cnGetPage();
    if (!pg) return;
    if (!confirm('Limpar esta página?')) return;
    pg.strokes = [];
    pg.elements = [];
    pg.writing = [];
    CN.writeRow = 0;
    const canvas = cnCanvasForPage(CN.currentPage);
    if (canvas) cnDrawPage(canvas);
    const elLayer = document.querySelector(`.cn-element-layer[data-element-page="${CN.currentPage}"]`);
    if (elLayer) elLayer.innerHTML = '';
    cnSave();
}

// ---------------- Toolbar ----------------
function cnRenderToolbar() {
    const wrap = document.getElementById('cn-toolbar');
    if (!wrap) return;
    wrap.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:18px;align-items:center;">
            <button class="btn btn-sm ${CN.currentTool === 'navigate' ? 'btn-primary' : 'btn-outline'} cn-tool-btn" data-tool="navigate" onclick="cnSetTool('navigate')">👆 Navegar</button>
            <button class="btn btn-sm ${CN.currentTool === 'pen' ? 'btn-primary' : 'btn-outline'} cn-tool-btn" data-tool="pen" onclick="cnSetTool('pen')">🖊️ Caneta</button>
            <button class="btn btn-sm ${CN.currentTool === 'highlighter' ? 'btn-primary' : 'btn-outline'} cn-tool-btn" data-tool="highlighter" onclick="cnSetTool('highlighter')">🖍️ Marcador</button>
            <button class="btn btn-sm ${CN.currentTool === 'eraser' ? 'btn-primary' : 'btn-outline'} cn-tool-btn" data-tool="eraser" onclick="cnSetTool('eraser')">🧹 Borracha</button>
            ${CN.activeNotebook && CN.activeNotebook.paper === 'lines' ? `<button class="btn btn-sm ${CN.currentTool === 'write' ? 'btn-primary' : 'btn-outline'} cn-tool-btn" data-tool="write" onclick="cnSetTool('write')">⌨️ Escrever nas linhas</button>` : ''}
            <button class="btn btn-sm btn-outline" style="padding:6px 14px;font-weight:700;" onclick="cnInsertText()">✍️ Texto</button>
            <span style="width:1px;height:22px;background:var(--border);"></span>
            <div id="cn-color-row" style="display:flex;gap:6px;flex-wrap:wrap;">
                ${cnColorSwatches()}
            </div>
            <input type="color" id="cn-custom-color" value="#2563EB" style="width:28px;height:28px;border:none;border-radius:50%;cursor:pointer;background:none;padding:0;" onchange="cnAddColorFromPicker()">
            <span style="width:1px;height:22px;background:var(--border);"></span>
            <input type="range" id="cn-size" min="1" max="20" value="3" style="width:90px;accent-color:var(--primary);" oninput="CN.currentWidth=parseInt(this.value)">
            <span id="cn-page-info" style="font-size:12px;color:var(--text-light);margin-left:6px;"></span>
            <span style="flex:1"></span>
            <button class="btn btn-sm btn-ghost" onclick="cnClearPage()">🗑️ Limpar pág.</button>
            <button class="btn btn-sm btn-ghost" onclick="cnUndoLastStroke()">↩️ Desfazer</button>
        </div>
    `;
    cnRefreshPageNav();
}

function cnColorSwatches() {
    return CN.customColors.map(c => `
        <div class="cn-color-swatch" data-color="${c}" onclick="cnSetColor('${c}')" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;box-shadow:${CN.currentColor === c ? '0 0 0 2px var(--bg),0 0 0 4px ' + c : 'var(--shadow-sm)'};"></div>
    `).join('');
}

function cnUndoLastStroke() {
    const pg = cnGetPage();
    if (!pg || !pg.strokes || pg.strokes.length === 0) return;
    pg.strokes.pop();
    const canvas = cnCanvasForPage(CN.currentPage);
    if (canvas) cnDrawPage(canvas);
    cnSave();
}

// ---------------- Element instertion (tables / trees / graphs) ----------------
function cnOpenElementsMenu() {
    const modal = document.getElementById('cn-elements-modal');
    if (modal) return cnCloseElementsMenu();
    const wrap = document.getElementById('cn-flip-wrap') || document.body;
    const modalEl = document.createElement('div');
    modalEl.id = 'cn-elements-modal';
    modalEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    modalEl.innerHTML = `
        <div style="background:var(--surface-solid);border:1px solid var(--border);border-radius:18px;padding:24px;max-width:640px;width:90%;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <div style="font-size:18px;font-weight:800;">🧩 Adicionar Elemento</div>
                <button class="btn btn-sm btn-ghost" onclick="cnCloseElementsMenu()">✕</button>
            </div>
            ${cnElementsTabs('table')}
            <div id="cn-elements-body" style="margin-top:16px;">${cnElementsBody('table')}</div>
        </div>
    `;
    document.body.appendChild(modalEl);
}

function cnCloseElementsMenu() {
    const m = document.getElementById('cn-elements-modal');
    if (m) m.remove();
}

function cnElementsTabs(active) {
    const tabs = [];
    if (CN.tablesEnabled) tabs.push(['table', '🔲 Tabela']);
    if (CN.treesEnabled) tabs.push(['tree', '🌳 Árvore']);
    if (CN.graphsEnabled) tabs.push(['graph', '📊 Gráfico']);
    return `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${tabs.map(([id, label]) => `<button class="btn btn-sm ${active === id ? 'btn-primary' : 'btn-ghost'} " data-ctype="${id}" onclick="cnElementsSwitch('${id}')">${label}</button>`).join('')}
        </div>
    `;
}

function cnElementsSwitch(type) {
    const modalEl = document.getElementById('cn-elements-modal');
    if (modalEl) {
        modalEl.querySelector('#cn-elements-body').innerHTML = cnElementsBody(type);
        modalEl.querySelectorAll('button[data-ctype]').forEach(b => {
            b.className = 'btn btn-sm ' + (b.dataset.ctype === type ? 'btn-primary' : 'btn-ghost');
        });
    }
}

function cnElementsBody(type) {
    if (type === 'table') {
        return `
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <div class="form-group" style="flex:1;min-width:80px;margin-bottom:0;">
                    <label>Linhas</label>
                    <input type="number" id="cn-tbl-rows" class="form-input" value="3" min="1" max="12">
                </div>
                <div class="form-group" style="flex:1;min-width:80px;margin-bottom:0;">
                    <label>Colunas</label>
                    <input type="number" id="cn-tbl-cols" class="form-input" value="3" min="1" max="8">
                </div>
                <button class="btn btn-primary" onclick="cnInsertTable()" style="margin-top:18px;">➕ Inserir Tabela</button>
            </div>
        `;
    }
    if (type === 'tree') {
        return `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label>Nó raiz</label>
                    <input type="text" id="cn-tree-root" class="form-input" value="Tema" placeholder="Tema">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>Nós filhos (separados por vírgula)</label>
                    <input type="text" id="cn-tree-children" class="form-input" value="Subtema 1, Subtema 2, Subtema 3" placeholder="A, B, C">
                </div>
            </div>
            <div class="form-group" style="margin-bottom:0;margin-top:10px;">
                <label>Nível 2 (opcional, por nó: A:n1,n2 | B:n3)</label>
                <input type="text" id="cn-tree-grandchildren" class="form-input" placeholder="Ex.: A:Ponto1,Ponto2 | B:Ponto3" style="width:100%;">
            </div>
            <button class="btn btn-primary" onclick="cnInsertTree()" style="margin-top:14px;">🌳 Inserir Árvore</button>
        `;
    }
    if (type === 'graph') {
        return `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label>Nome do gráfico</label>
                    <input type="text" id="cn-graph-title" class="form-input" value="Resultados">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>Tipo de gráfico</label>
                    <select id="cn-graph-type" class="form-input">
                        <option value="bar">📊 Barras</option>
                        <option value="line">📈 Linhas</option>
                        <option value="pie">🥧 Circular</option>
                        <option value="radar">🕸️ Radar</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top:10px;margin-bottom:0;">
                <label>Dados (formato: rótulo=valor; por linha)</label>
                <textarea id="cn-graph-data" class="form-input" style="min-height:90px;resize:vertical;" placeholder="Matemática=90&#10;Física=75&#10;Português=88&#10;Biologia=92"></textarea>
            </div>
            <button class="btn btn-primary" onclick="cnInsertGraph()" style="margin-top:14px;">📊 Inserir Gráfico</button>
        `;
    }
    return '';
}

// ---------------- Insert elements into page ----------------
function cnInsertTable() {
    const rows = parseInt(document.getElementById('cn-tbl-rows').value) || 3;
    const cols = parseInt(document.getElementById('cn-tbl-cols').value) || 3;
    let html = '<table style="border-collapse:collapse;width:96%;margin:4px auto 0;font-size:12px;color:#1e293b;">';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            html += '<td style="border:1.5px solid #94a3b8;padding:6px;min-width:36px;text-align:center;" contenteditable="true">&nbsp;</td>';
        }
        html += '</tr>';
    }
    html += '</table>';
    cnInsertElementHTML(html, 340, 160, null, 'table');
}

function cnInsertTree() {
    const root = document.getElementById('cn-tree-root').value.trim() || 'Tema';
    const children = document.getElementById('cn-tree-children').value.split(',').map(s => s.trim()).filter(Boolean);
    const grandchildrenRaw = document.getElementById('cn-tree-grandchildren').value;
    const gcmap = {};
    if (grandchildrenRaw) {
        grandchildrenRaw.split('|').forEach(part => {
            const [parent, kids] = part.split(':');
            if (parent && kids) gcmap[parent.trim()] = kids.split(',').map(s => s.trim()).filter(Boolean);
        });
    }
    const childHtml = children.map(c => {
        const gcs = gcmap[c] || [];
        const gcHtml = gcs.length ? '<div style="display:flex;margin-top:6px;gap:10px;justify-content:center;flex-wrap:wrap;">' + gcs.map(g => cnTreeNodeHTML(g)).join('') + '</div>' : '';
        return `<div style="display:flex;flex-direction:column;align-items:center;margin:0 8px;">${cnTreeNodeHTML(c)}${gcHtml}</div>`;
    }).join('');

    const html = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:8px;width:96%;margin:0 auto;">
            ${cnTreeNodeHTML(root)}
            <div style="display:flex;margin-top:8px;justify-content:center;flex-wrap:wrap;">${childHtml}</div>
        </div>
    `;
    cnInsertElementHTML(html, 380, 220, null, 'tree');
}

function cnTreeNodeHTML(label) {
    return `<div style="background:#eef2ff;border:1.5px solid #6366f1;color:#1e293b;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;white-space:nowrap;" contenteditable="true">${cnEscape(label)}</div>`;
}

function cnInsertGraph() {
    const title = document.getElementById('cn-graph-title').value.trim() || 'Gráfico';
    const type = document.getElementById('cn-graph-type').value || 'bar';
    const dataRaw = document.getElementById('cn-graph-data').value;
    const rows = dataRaw.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [label, val] = l.split('=');
        return { label: (label || '').trim(), value: parseFloat(val) || 0 };
    });
    const chartId = 'cn-chart-' + Date.now();
    const html = `
        <div style="width:100%;text-align:center;background:#fff;border-radius:10px;padding:8px;box-sizing:border-box;">
            <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;padding:4px;" contenteditable="true">${cnEscape(title)}</div>
            <div id="${chartId}" style="width:100%;height:190px;position:relative;"></div>
        </div>
    `;
    cnInsertElementHTML(html, 360, 250, null, 'chart', { chartId, chartType: type, chartRows: rows });
}

function cnBuildChart(id, type, rows) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.Chart && rows.length) {
        try {
            new Chart(el, {
                type: type,
                data: { labels: rows.map(r => r.label), datasets: [{ label: 'Valor', data: rows.map(r => r.value), backgroundColor: ['#2563EB','#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#0EA5E9','#22C55E'], borderColor: '#2563EB', borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        } catch (e) {}
    }
}

function cnRebuildChart(el, store) {
    const holder = el.querySelector('[id^="cn-chart-"]');
    if (holder && store.chartRows && store.chartRows.length) cnBuildChart(holder.id, store.chartType || 'bar', store.chartRows);
}

function cnInsertText() {
    const pg = cnGetPage();
    const elLayer = document.querySelector(`.cn-element-layer[data-element-page="${CN.currentPage}"]`);
    if (!elLayer) return;
    const elId = 'cel_' + Date.now();
    const elData = {
        id: elId, x: 50, y: 50, w: 260, h: 60, type: 'text',
        html: `<div class="cn-text-box" contenteditable="true" style="font-size:15px;color:#0f172a;line-height:1.5;padding:6px 10px;font-family:inherit;outline:none;white-space:pre-wrap;">Escreve aqui...</div>`
    };
    pg.elements = pg.elements || [];
    pg.elements.push(elData);
    cnRenderPageElement(elLayer, elData, pg.elements.length - 1);
    cnSave();
    const el = elLayer.lastElementChild;
    if (el) {
        setTimeout(() => {
            const box = el.querySelector('.cn-text-box') || el;
            box.focus();
            if (box.select) box.select();
            el.style.zIndex = '6';
        }, 30);
    }
}

function cnInsertElementHTML(html, w, h, after, type, extra) {
    const pg = cnGetPage();
    const elLayer = document.querySelector(`.cn-element-layer[data-element-page="${CN.currentPage}"]`);
    if (!elLayer) return;
    const elId = 'cel_' + Date.now();
    const elData = { id: elId, x: 50, y: 50, w, h, type: type || 'custom', html };
    if (extra) Object.assign(elData, extra);
    pg.elements = pg.elements || [];
    pg.elements.push(elData);
    cnRenderPageElement(elLayer, elData, pg.elements.length - 1);
    cnSave();
    cnCloseElementsMenu();
    if (after) setTimeout(after, 50);
}

function cnRenderPageElement(layer, elData, index) {
    const div = document.createElement('div');
    div.innerHTML = elData.html;
    const child = div.firstElementChild;
    if (!child) return;
    const newEl = child;
    newEl.dataset.elIndex = index != null ? index : (layer.children.length);
    newEl.style.position = 'absolute';
    newEl.style.left = (elData.x != null ? elData.x : 50) + '%';
    newEl.style.top = (elData.y != null ? elData.y : 50) + '%';
    newEl.style.transform = 'translate(-50%,-50%)';
    newEl.style.width = (elData.w || 300) + 'px';
    newEl.style.minHeight = (elData.h || 200) + 'px';
    if (elData.type === 'text') {
        newEl.style.background = 'transparent';
        newEl.style.border = '1px dashed rgba(100,116,139,0.4)';
        newEl.style.borderRadius = '4px';
        newEl.style.boxShadow = 'none';
        newEl.style.minWidth = '120px';
        newEl.style.cursor = 'default';
    } else {
        newEl.style.background = '#fff';
        newEl.style.borderRadius = '10px';
        newEl.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
        newEl.style.cursor = 'move';
    }
    newEl.style.pointerEvents = 'auto';
    newEl.style.zIndex = '5';
    if (elData.type === 'text') {
        const handle = document.createElement('div');
        handle.style.cssText = 'position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:56px;height:16px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#6366f1;cursor:grab;user-select:none;z-index:7;';
        handle.textContent = '✥ arrastar';
        handle.addEventListener('pointerdown', e => {
            e.preventDefault();
            e.stopPropagation();
            cnMakeElementDraggable(newEl);
            newEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: false, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId }));
        });
        newEl.appendChild(handle);
        const del = document.createElement('div');
        del.style.cssText = 'position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#ef4444;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:7;font-weight:700;';
        del.textContent = '✕';
        del.addEventListener('click', e => {
            e.stopPropagation();
            cnDeleteElement(newEl);
        });
        newEl.appendChild(del);
    }
    layer.appendChild(newEl);
    if (elData.type !== 'text') cnMakeElementDraggable(newEl);
    if (elData.type === 'chart' && elData.chartId) cnRebuildChart(newEl, elData);
    const editable = newEl.querySelectorAll('[contenteditable="true"]');
    if (editable.length) {
        newEl.addEventListener('input', () => cnPersistElementHTML(layer, newEl));
    }
}

function cnPersistElementHTML(layer, el) {
    const pageIdx = layer.getAttribute('data-element-page');
    const pg = CN.activeNotebook.pages[pageIdx];
    const idx = el.dataset.elIndex;
    if (pg && pg.elements && idx != null) {
        pg.elements[parseInt(idx)].html = el.outerHTML;
        cnSave();
    }
}

function cnMakeElementDraggable(el) {
    el.addEventListener('pointerdown', e => {
        if (e.target.closest('[contenteditable="true"]') || e.target.tagName === 'CANVAS') return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const rect = el.getBoundingClientRect();
        const layer = el.parentElement;
        const layerRect = layer.getBoundingClientRect();
        function move(ev) {
            const dx = (ev.clientX - startX), dy = (ev.clientY - startY);
            const nx = Math.max(0, Math.min(100, ((rect.left + dx - layerRect.left) / layerRect.width) * 100));
            const ny = Math.max(0, Math.min(100, ((rect.top + dy - layerRect.top) / layerRect.height) * 100));
            el.style.left = nx + '%';
            el.style.top = ny + '%';
            el.dataset.x = nx; el.dataset.y = ny;
            const store = cnFindElementStore(el);
            if (store) { store.x = Math.round(nx * 10) / 10; store.y = Math.round(ny * 10) / 10; }
        }
        function up() {
            cnSave();
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    });
}

function cnFindElementStore(el) {
    const pg = cnGetPage();
    if (!pg || !pg.elements) return null;
    const idx = el.dataset.elIndex;
    if (idx != null) return pg.elements[parseInt(idx)];
    return null;
}

function cnDeleteElement(el) {
    const pg = cnGetPage();
    const layer = el.parentElement;
    if (pg && pg.elements && el.dataset.elIndex != null) {
        pg.elements.splice(parseInt(el.dataset.elIndex), 1);
        el.remove();
        if (layer) {
            Array.from(layer.children).forEach((c, i) => { c.dataset.elIndex = i; });
        }
        cnSave();
        cnDrawAllPages();
    }
}

// ---------------- AI Summary ----------------
function cnOpenAI() {
    const modal = document.createElement('div');
    modal.id = 'cn-ai-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    modal.innerHTML = `
        <div style="background:var(--surface-solid);border:1px solid var(--border);border-radius:18px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:18px;font-weight:800;">✨ Resumir Apontamentos com IA</div>
                <button class="btn btn-sm btn-ghost" onclick="cnCloseAI()">✕</button>
            </div>
            <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">A IA vai analisar os teus apontamentos e criar um resumo claro e estruturado.</p>
            <button class="btn btn-ai" onclick="cnRunAI()" id="cn-ai-btn" style="width:100%;">✨ Gerar Resumo</button>
            <div id="cn-ai-result" style="margin-top:16px;line-height:1.7;font-size:14px;"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

function cnCloseAI() {
    const m = document.getElementById('cn-ai-modal');
    if (m) m.remove();
}

async function cnRunAI() {
    const btn = document.getElementById('cn-ai-btn');
    const result = document.getElementById('cn-ai-result');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '⏳ A analisar apontamentos...';
    result.innerHTML = '<div class="spinner" style="margin:0 auto;"></div>';
    try {
        const content = cnExtractText();
        let answer;
        if (typeof callAI === 'function') {
            answer = await callAI(`Resume os seguintes apontamentos de forma clara e estruturada. Devolve um resumo com os pontos principais, e no fim 3 ideias-chave para memorizar. Apontamentos:\n\n${content || '(sem texto detetado)'}`);
        } else {
            answer = cnFallbackSummary(content);
        }
        result.innerHTML = `<div style="white-space:pre-wrap;">${cnEscape(answer)}</div>`;
    } catch (e) {
        result.innerHTML = '<span style="color:var(--danger);">Erro: ' + cnEscape(e.message) + '</span>';
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ Gerar Resumo';
    }
}

function cnExtractText() {
    const nb = CN.activeNotebook;
    if (!nb) return '';
    const texts = [];
    (nb.pages || []).forEach((pg, i) => {
        (pg.elements || []).forEach(el => {
            texts.push('Página ' + (i + 1) + ': ' + el.html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').trim());
        });
    });
    return texts.join(' ');
}

function cnFallbackSummary(content) {
    const words = content.split(/\s+/).filter(Boolean);
    return 'Assistente de resumo não disponível offline.\n\nConteúdo detetado (' + words.length + ' palavras):\n' + (content.slice(0, 300) || 'Nenhum texto nos elementos.');
}
