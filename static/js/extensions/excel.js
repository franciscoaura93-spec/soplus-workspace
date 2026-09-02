let excelData = [];
const excelRows = 100;
const excelCols = 52;
let excelSelected = null;
let excelSelectionRange = null;
let excelClipboard = null;
let excelContextRow = -1;
let excelContextCol = -1;

window.renderExcel = function(area) {
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>📊 Excel</h2><p>Folha de cálculo melhorada</p></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <select class="form-input" id="excel-formula-select" style="width:120px;padding:6px 10px;font-size:12px;" onchange="excelInsertFormula(this.value);this.value=''">
                    <option value="">Σ Funções</option>
                    <option value="SUM">SUM</option><option value="AVG">AVG</option><option value="COUNT">COUNT</option>
                    <option value="MIN">MIN</option><option value="MAX">MAX</option><option value="IF">IF</option>
                </select>
                <button class="btn btn-sm btn-primary" onclick="excelSave()">💾 Guardar</button>
                <button class="btn btn-sm btn-outline" onclick="excelLoad()">📂 Carregar</button>
                <button class="btn btn-sm btn-outline" onclick="excelExportCSV()">📥 CSV</button>
                <button class="btn btn-sm btn-outline" onclick="excelImportCSV()">📤 Importar CSV</button>
            </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
            <div id="excel-toolbar" style="padding:6px 12px;display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--surface);align-items:center;">
                <button class="btn btn-sm btn-ghost" onclick="excelFormat('bold')" title="Negrito"><b>B</b></button>
                <button class="btn btn-sm btn-ghost" onclick="excelFormat('italic')" title="Itálico"><i>I</i></button>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <input type="color" value="#000000" style="width:26px;height:24px;border:none;cursor:pointer;padding:0;" onchange="excelFormat('color',this.value)" title="Cor do texto">
                <input type="color" value="#ffffff" style="width:26px;height:24px;border:none;cursor:pointer;padding:0;" onchange="excelFormat('fill',this.value)" title="Cor de fundo">
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <select class="form-input" style="width:80px;padding:4px 6px;font-size:11px;" onchange="excelFormat('fontSize',this.value)">
                    <option value="11">11</option><option value="12">12</option><option value="14">14</option><option value="16">16</option><option value="18">18</option><option value="20">20</option><option value="24">24</option>
                </select>
                <select class="form-input" style="width:90px;padding:4px 6px;font-size:11px;" onchange="excelFormat('align',this.value)">
                    <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
                </select>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <span id="excel-cell-ref" style="font-size:12px;font-weight:600;color:var(--primary);min-width:60px;">A1</span>
                <input id="excel-formula-bar" class="form-input" style="flex:1;padding:4px 8px;font-size:12px;min-width:100px;" placeholder="=FÓRMULA" onchange="excelEvalFormulaBar(this.value)">
            </div>
            <div id="excel-grid" style="overflow:auto;max-height:calc(100vh - 270px);position:relative;" oncontextmenu="excelContextMenu(event)"></div>
        </div>
        <div id="excel-context-menu" style="display:none;position:fixed;background:var(--surface-solid);border:1px solid var(--border);border-radius:10px;padding:6px;z-index:1000;min-width:170px;box-shadow:var(--shadow-lg);"></div>
    `;
    initExcel();
};

function initExcel() {
    excelData = [];
    for (let r = 0; r < excelRows; r++) {
        excelData[r] = [];
        for (let c = 0; c < excelCols; c++) excelData[r][c] = { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' };
    }
    renderExcelGrid();
}

function colLetter(c) { return String.fromCharCode(65 + c); }
function cellRef(r, c) { return colLetter(c) + (r + 1); }

function renderExcelGrid() {
    const grid = document.getElementById('excel-grid');
    if (!grid) return;
    let html = '<table class="excel-table" style="border-collapse:collapse;width:100%;"><thead><tr><th class="excel-header-corner" style="min-width:45px;padding:4px;background:var(--surface);border:1px solid var(--border);position:sticky;left:0;top:0;z-index:3;"></th>';
    for (let c = 0; c < excelCols; c++) {
        html += `<th class="excel-header" style="min-width:90px;padding:4px 8px;background:var(--surface);border:1px solid var(--border);position:sticky;top:0;z-index:2;font-size:12px;color:var(--text-light);text-align:center;font-weight:700;">${colLetter(c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < excelRows; r++) {
        html += `<tr><th class="excel-row-header" style="min-width:45px;padding:4px;background:var(--surface);border:1px solid var(--border);position:sticky;left:0;z-index:1;font-size:12px;color:var(--text-light);text-align:center;font-weight:700;">${r + 1}</th>`;
        for (let c = 0; c < excelCols; c++) {
            const cell = excelData[r]?.[c] || { v: '' };
            const style = [];
            if (cell.bold) style.push('font-weight:bold');
            if (cell.italic) style.push('font-style:italic');
            if (cell.color) style.push('color:' + cell.color);
            if (cell.fill) style.push('background:' + cell.fill);
            if (cell.fontSize) style.push('font-size:' + cell.fontSize + 'px');
            if (cell.align) style.push('text-align:' + cell.align);
            const sel = excelSelected && excelSelected.r === r && excelSelected.c === c ? ' selected' : '';
            html += `<td class="excel-cell${sel}" data-r="${r}" data-c="${c}" style="border:1px solid var(--border);padding:0;">`;
            html += `<input class="excel-input" data-r="${r}" data-c="${c}" value="${escapeHTML(String(cell.v))}" style="${style.join(';')}" onchange="excelUpdateCell(${r},${c},this.value)" onfocus="excelSelectCell(${r},${c})" onkeydown="excelCellKeydown(event,${r},${c})" onmousedown="excelMouseDown(event,${r},${c})" onmouseover="excelMouseOver(event,${r},${c})" />`;
            html += `</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    grid.innerHTML = html;
    initResizeHandles();
}

function initResizeHandles() {
    const grid = document.getElementById('excel-grid');
    if (!grid) return;
    const table = grid.querySelector('table');
    if (!table) return;
    const headers = table.querySelectorAll('.excel-header');
    headers.forEach((th, i) => {
        th.style.position = 'relative';
        const handle = document.createElement('div');
        handle.className = 'excel-resize-handle';
        handle.style.cssText = 'position:absolute;top:0;right:-3px;width:6px;height:100%;cursor:col-resize;z-index:5;';
        handle.dataset.index = i;
        let startX, startW;
        handle.onmousedown = function(e) {
            e.preventDefault(); e.stopPropagation();
            startX = e.clientX;
            startW = th.offsetWidth;
            const onMove = function(ev) {
                const w = Math.max(40, startW + (ev.clientX - startX));
                const cells = table.querySelectorAll(`.excel-cell:nth-child(${i + 2}), .excel-header:nth-child(${i + 2}), .excel-row-header + .excel-cell:nth-child(${i + 2}), .excel-header-corner + .excel-header:nth-child(${i + 2})`);
                const ths = table.querySelectorAll(`.excel-header`);
                if (ths[i]) ths[i].style.minWidth = w + 'px';
                cells.forEach(el => { if (el) el.style.minWidth = w + 'px'; });
            };
            const onUp = function() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };
        th.appendChild(handle);
    });
    const rowHeaders = table.querySelectorAll('.excel-row-header');
    rowHeaders.forEach((th, i) => {
        th.style.position = 'relative';
        const handle = document.createElement('div');
        handle.style.cssText = 'position:absolute;left:0;bottom:-3px;width:100%;height:6px;cursor:row-resize;z-index:5;';
        handle.dataset.index = i;
        let startY, startH;
        handle.onmousedown = function(e) {
            e.preventDefault(); e.stopPropagation();
            startY = e.clientY;
            startH = th.offsetHeight;
            const onMove = function(ev) {
                const h = Math.max(24, startH + (ev.clientY - startY));
                const row = table.querySelectorAll('tbody tr')[i];
                if (row) { row.querySelectorAll('td, th').forEach(el => el.style.height = h + 'px'); }
                th.style.height = h + 'px';
            };
            const onUp = function() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };
        th.appendChild(handle);
    });
}

function excelUpdateCell(r, c, val) {
    if (!excelData[r]) excelData[r] = [];
    if (!excelData[r][c]) excelData[r][c] = { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' };
    const cell = excelData[r][c];
    cell.v = val;
    if (typeof val === 'string' && val.startsWith('=')) {
        const result = excelEvalFormula(val, r, c);
        if (result !== null && result !== undefined) {
            const input = document.querySelector(`.excel-input[data-r="${r}"][data-c="${c}"]`);
            if (input) { input.dataset.formula = val; input.value = result; cell.v = result; }
        }
    } else {
        const input = document.querySelector(`.excel-input[data-r="${r}"][data-c="${c}"]`);
        if (input) delete input.dataset.formula;
    }
}

function excelSelectCell(r, c) {
    excelSelected = { r, c };
    const ref = document.getElementById('excel-cell-ref');
    if (ref) ref.textContent = cellRef(r, c);
    const formulaBar = document.getElementById('excel-formula-bar');
    if (formulaBar) {
        const cell = excelData[r]?.[c];
        formulaBar.value = cell && cell.v && typeof cell.v === 'string' && cell.v.startsWith('=') ? cell.v : (cell ? cell.v : '');
    }
    document.querySelectorAll('.excel-cell').forEach(el => el.classList.remove('selected'));
    const cellEl = document.querySelector(`.excel-cell[data-r="${r}"][data-c="${c}"]`);
    if (cellEl) cellEl.classList.add('selected');
}

function excelCellKeydown(e, r, c) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const nc = e.shiftKey ? Math.max(0, c - 1) : Math.min(excelCols - 1, c + 1);
        const next = document.querySelector(`.excel-input[data-r="${r}"][data-c="${nc}"]`);
        if (next) next.focus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const nr = Math.min(excelRows - 1, r + 1);
        const next = document.querySelector(`.excel-input[data-r="${nr}"][data-c="${c}"]`);
        if (next) next.focus();
    } else if (e.key === 'Escape') {
        e.target.blur();
    }
}

let excelMouseDownCell = null;
function excelMouseDown(e, r, c) {
    if (e.shiftKey && excelMouseDownCell) {
        const minR = Math.min(excelMouseDownCell.r, r);
        const maxR = Math.max(excelMouseDownCell.r, r);
        const minC = Math.min(excelMouseDownCell.c, c);
        const maxC = Math.max(excelMouseDownCell.c, c);
        excelSelectionRange = { minR, maxR, minC, maxC };
        document.querySelectorAll('.excel-cell').forEach(el => {
            const er = parseInt(el.dataset.r), ec = parseInt(el.dataset.c);
            if (er >= minR && er <= maxR && ec >= minC && ec <= maxC) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        return;
    }
    excelMouseDownCell = { r, c };
    excelSelectionRange = null;
}

function excelMouseOver(e, r, c) {
    if (e.buttons === 1 && excelMouseDownCell) {
        const minR = Math.min(excelMouseDownCell.r, r);
        const maxR = Math.max(excelMouseDownCell.r, r);
        const minC = Math.min(excelMouseDownCell.c, c);
        const maxC = Math.max(excelMouseDownCell.c, c);
        excelSelectionRange = { minR, maxR, minC, maxC };
        document.querySelectorAll('.excel-cell').forEach(el => {
            const er = parseInt(el.dataset.r), ec = parseInt(el.dataset.c);
            if (er >= minR && er <= maxR && ec >= minC && ec <= maxC) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    }
}

function excelGetSelectedRange() {
    if (excelSelectionRange) return excelSelectionRange;
    if (excelSelected) return { minR: excelSelected.r, maxR: excelSelected.r, minC: excelSelected.c, maxC: excelSelected.c };
    return null;
}

function excelFormat(action, val) {
    const range = excelGetSelectedRange();
    if (!range) return showToast('Seleciona uma célula', 'warning');
    for (let r = range.minR; r <= range.maxR; r++) {
        for (let c = range.minC; c <= range.maxC; c++) {
            if (!excelData[r]) excelData[r] = [];
            if (!excelData[r][c]) excelData[r][c] = { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' };
            const cell = excelData[r][c];
            if (action === 'bold') cell.bold = !cell.bold;
            else if (action === 'italic') cell.italic = !cell.italic;
            else if (action === 'color') cell.color = val;
            else if (action === 'fill') cell.fill = val;
            else if (action === 'fontSize') cell.fontSize = val;
            else if (action === 'align') cell.align = val;
        }
    }
    renderExcelGrid();
    if (excelSelected) {
        const input = document.querySelector(`.excel-input[data-r="${excelSelected.r}"][data-c="${excelSelected.c}"]`);
        if (input) input.focus();
    }
}

function excelInsertFormula(fn) {
    if (!excelSelected) return showToast('Seleciona uma célula', 'warning');
    const r = excelSelected.r, c = excelSelected.c;
    const input = document.querySelector(`.excel-input[data-r="${r}"][data-c="${c}"]`);
    if (input) {
        input.value = '=' + fn + '(';
        input.focus();
    }
}

function excelEvalFormulaBar(val) {
    if (!excelSelected) return;
    const r = excelSelected.r, c = excelSelected.c;
    excelUpdateCell(r, c, val);
    renderExcelGrid();
    const input = document.querySelector(`.excel-input[data-r="${r}"][data-c="${c}"]`);
    if (input) { input.focus(); }
}

function excelEvalFormula(formula, selfR, selfC) {
    try {
        let f = formula.substring(1).trim();
        const fnMatch = f.match(/^(SUM|AVG|COUNT|MIN|MAX|IF)\s*\((.+)\)$/i);
        if (!fnMatch) return null;
        const fn = fnMatch[1].toUpperCase();
        const args = fnMatch[2].trim();

        if (fn === 'IF') {
            const parts = excelSplitArgs(args);
            if (parts.length < 2) return null;
            const condResult = excelEvalExpression(parts[0], selfR, selfC);
            return condResult ? excelEvalExpression(parts[1], selfR, selfC) : (parts[2] ? excelEvalExpression(parts[2], selfR, selfC) : '');
        }

        const values = excelParseRange(args, selfR, selfC);
        const nums = values.filter(v => typeof v === 'number' && !isNaN(v));

        if (fn === 'SUM') return nums.reduce((a, b) => a + b, 0);
        if (fn === 'AVG') return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
        if (fn === 'COUNT') return nums.length;
        if (fn === 'MIN') return nums.length ? Math.min(...nums) : 0;
        if (fn === 'MAX') return nums.length ? Math.max(...nums) : 0;
        return null;
    } catch(e) { return '#ERRO'; }
}

function excelParseRange(arg, selfR, selfC) {
    const results = [];
    const parts = arg.split(',');
    for (const part of parts) {
        const p = part.trim();
        const rangeMatch = p.match(/^([A-Z])(\d+):([A-Z])(\d+)$/i);
        if (rangeMatch) {
            const c1 = rangeMatch[1].toUpperCase().charCodeAt(0) - 65;
            const r1 = parseInt(rangeMatch[2]) - 1;
            const c2 = rangeMatch[3].toUpperCase().charCodeAt(0) - 65;
            const r2 = parseInt(rangeMatch[4]) - 1;
            for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
                for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                    results.push(excelGetCellValue(r, c));
                }
            }
        } else {
            const cellMatch = p.match(/^([A-Z])(\d+)$/i);
            if (cellMatch) {
                const cc = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
                const rr = parseInt(cellMatch[2]) - 1;
                results.push(excelGetCellValue(rr, cc));
            } else {
                results.push(parseFloat(p) || 0);
            }
        }
    }
    return results;
}

function excelGetCellValue(r, c) {
    if (r < 0 || r >= excelRows || c < 0 || c >= excelCols) return 0;
    const cell = excelData[r]?.[c];
    if (!cell) return 0;
    const v = cell.v;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        if (v.startsWith('=')) {
            const result = excelEvalFormula(v, r, c);
            return result !== null && result !== undefined ? (parseFloat(result) || result) : 0;
        }
        const n = parseFloat(v.replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }
    return 0;
}

function excelEvalExpression(expr, selfR, selfC) {
    expr = expr.trim();
    const cellMatch = expr.match(/^([A-Z])(\d+)$/i);
    if (cellMatch) {
        const cc = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
        const rr = parseInt(cellMatch[2]) - 1;
        return excelGetCellValue(rr, cc);
    }
    const num = parseFloat(expr);
    if (!isNaN(num)) return num;
    const opMatch = expr.match(/^([A-Z])(\d+)\s*([><=!]+)\s*(.+)$/i);
    if (opMatch) {
        const cc = opMatch[1].toUpperCase().charCodeAt(0) - 65;
        const rr = parseInt(opMatch[2]) - 1;
        const left = excelGetCellValue(rr, cc);
        const right = parseFloat(opMatch[3]) || opMatch[3].trim();
        const rVal = typeof right === 'number' ? right : parseFloat(right);
        switch(opMatch[3]) {
            case '>': return left > rVal;
            case '<': return left < rVal;
            case '>=': return left >= rVal;
            case '<=': return left <= rVal;
            case '==': case '=': return left == rVal;
            case '!=': return left != rVal;
        }
    }
    return expr.toLowerCase() === 'true' ? true : expr.toLowerCase() === 'false' ? false : expr;
}

function excelSplitArgs(args) {
    const parts = [];
    let depth = 0, current = '';
    for (const ch of args) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
        else current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function excelContextMenu(e) {
    e.preventDefault();
    const el = e.target.closest('.excel-cell') || e.target.closest('.excel-header') || e.target.closest('.excel-row-header');
    if (!el) return;
    const r = parseInt(el.dataset.r);
    const c = parseInt(el.dataset.c);
    if (!isNaN(r) && !isNaN(c)) {
        excelSelected = { r, c };
        excelContextRow = r;
        excelContextCol = c;
    }
    const menu = document.getElementById('excel-context-menu');
    menu.style.display = 'block';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.innerHTML = `
        <div class="excel-menu-item" onclick="excelContextAction('copy')">📋 Copiar</div>
        <div class="excel-menu-item" onclick="excelContextAction('paste')">📌 Colar</div>
        <div class="excel-menu-item" onclick="excelContextAction('cut')">✂️ Cortar</div>
        <div style="height:1px;background:var(--border);margin:4px 0;"></div>
        <div class="excel-menu-item" onclick="excelContextAction('insertRow')">➕ Inserir Linha</div>
        <div class="excel-menu-item" onclick="excelContextAction('insertCol')">➕ Inserir Coluna</div>
        <div class="excel-menu-item" onclick="excelContextAction('deleteRow')">➖ Eliminar Linha</div>
        <div class="excel-menu-item" onclick="excelContextAction('deleteCol')">➖ Eliminar Coluna</div>
        <div style="height:1px;background:var(--border);margin:4px 0;"></div>
        <div class="excel-menu-item" onclick="excelContextAction('clear')">🧹 Limpar Célula</div>
    `;
    document.addEventListener('click', excelCloseContextMenu, { once: true });
}

function excelCloseContextMenu() {
    const menu = document.getElementById('excel-context-menu');
    if (menu) menu.style.display = 'none';
}

function excelContextAction(action) {
    excelCloseContextMenu();
    const r = excelContextRow, c = excelContextCol;
    if (r < 0 || c < 0) return;
    if (action === 'copy') {
        const cell = excelData[r]?.[c];
        excelClipboard = { type: 'cell', data: cell ? { ...cell } : { v: '' }, r, c };
        showToast('Copiado', 'success');
    } else if (action === 'paste' && excelClipboard) {
        if (!excelData[r]) excelData[r] = [];
        excelData[r][c] = { ...excelClipboard.data };
        renderExcelGrid();
        const input = document.querySelector(`.excel-input[data-r="${r}"][data-c="${c}"]`);
        if (input) input.focus();
        showToast('Colado', 'success');
    } else if (action === 'cut') {
        if (!excelData[r]) excelData[r] = [];
        excelClipboard = { type: 'cell', data: excelData[r][c] ? { ...excelData[r][c] } : { v: '' }, r, c };
        excelData[r][c] = { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' };
        renderExcelGrid();
        showToast('Cortado', 'success');
    } else if (action === 'insertRow') {
        excelData.splice(r, 0, Array.from({length: excelCols}, () => ({ v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' })));
        if (excelData.length > excelRows) excelData.pop();
        renderExcelGrid();
    } else if (action === 'insertCol') {
        for (let i = 0; i < excelData.length; i++) {
            if (!excelData[i]) excelData[i] = [];
            excelData[i].splice(c, 0, { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' });
            if (excelData[i].length > excelCols) excelData[i].pop();
        }
        renderExcelGrid();
    } else if (action === 'deleteRow') {
        if (excelData.length <= 1) return showToast('Não podes eliminar todas as linhas', 'warning');
        excelData.splice(r, 1);
        renderExcelGrid();
    } else if (action === 'deleteCol') {
        for (let i = 0; i < excelData.length; i++) {
            if (excelData[i]) excelData[i].splice(c, 1);
        }
        renderExcelGrid();
    } else if (action === 'clear') {
        if (excelData[r]) excelData[r][c] = { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' };
        renderExcelGrid();
    }
}

async function excelSave() {
    const nome = prompt('Nome da folha:', window._excelSheetName || 'Folha 1');
    if (!nome) return;
    window._excelSheetName = nome;
    const ref = window._excelSheetKey ? db.ref('excel_sheets/' + window._excelSheetKey) : db.ref('excel_sheets').push();
    window._excelSheetKey = ref.key || window._excelSheetKey;
    await ref.set({ nome, data: excelData, autorId: currentUser.uid, autorNome: userProfile?.nome, updatedAt: Date.now(), createdAt: window._excelSheetCreatedAt || Date.now() });
    showToast('Guardado!', 'success');
}

async function excelLoad() {
    const snap = await dbGet('excel_sheets');
    const sheets = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (sheets.length === 0) return showToast('Sem folhas guardadas', 'error');
    const choice = prompt('Folhas:\n' + sheets.map((s,i) => `${i+1}. ${s.nome}`).join('\n') + '\n\nNúmero:');
    const s = sheets[parseInt(choice) - 1];
    if (s && s.data) {
        excelData = s.data;
        window._excelSheetKey = s.id;
        window._excelSheetName = s.nome;
        window._excelSheetCreatedAt = s.createdAt;
        renderExcelGrid();
        showToast('Carregado!', 'success');
    }
}

function excelExportCSV() {
    let csv = '';
    for (let r = 0; r < excelData.length; r++) {
        const row = [];
        for (let c = 0; c < excelCols; c++) {
            const cell = excelData[r]?.[c];
            let val = cell ? String(cell.v) : '';
            if (val.includes(',') || val.includes('"') || val.includes('\n')) val = '"' + val.replace(/"/g, '""') + '"';
            row.push(val);
        }
        csv += row.join(',') + '\n';
    }
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (window._excelSheetName || 'folha') + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Exportado como CSV!', 'success');
}

function excelImportCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const text = ev.target.result;
            const lines = text.split('\n');
            for (let r = 0; r < Math.min(lines.length, excelRows); r++) {
                const vals = excelParseCSVLine(lines[r]);
                for (let c = 0; c < Math.min(vals.length, excelCols); c++) {
                    if (!excelData[r]) excelData[r] = [];
                    if (!excelData[r][c]) excelData[r][c] = { v: '', bold: false, italic: false, color: '', fill: '', fontSize: '', align: '' };
                    excelData[r][c].v = vals[c];
                }
            }
            renderExcelGrid();
            showToast('CSV importado!', 'success');
        };
        reader.readAsText(file);
    };
    input.click();
}

function excelParseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else current += ch;
    }
    result.push(current.trim());
    return result;
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.excel-menu-item')) excelCloseContextMenu();
});
