// S&O+ Extension: Pesquisa
let pesqPrivado = false;

function renderPesquisa(area, ext) {
    pesqPrivado = false;
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;gap:12px;align-items:center;">
                <input class="form-input" id="search-input" placeholder="Pesquisar na web..." style="flex:1;" onkeydown="if(event.key==='Enter')doWebSearch()">
                <button class="btn btn-primary" onclick="doWebSearch()">🔍 Pesquisar</button>
            </div>
            <div id="pesq-priv-bar" style="display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
                <button id="pesq-priv-btn" onclick="togglePesqPrivado()" style="display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.25s;">
                    🕶️ <span id="pesq-priv-label">Modo Privado</span>
                </button>
                <span id="pesq-priv-status" style="font-size:11px;color:var(--text-light);">Pesquisas são guardadas no histórico</span>
            </div>
        </div>
        <div id="search-results"></div>
        <div id="pesq-history-wrap">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="font-size:14px;font-weight:700;">📋 Histórico de Pesquisas</h3>
                <button class="btn btn-outline" onclick="clearSearchHistory()" style="font-size:11px;padding:4px 12px;">Limpar</button>
            </div>
            <div id="search-history"></div>
        </div>
    `;
    loadSearchHistory();
}

function togglePesqPrivado() {
    pesqPrivado = !pesqPrivado;
    const btn = document.getElementById('pesq-priv-btn');
    const lbl = document.getElementById('pesq-priv-label');
    const st  = document.getElementById('pesq-priv-status');
    const hw  = document.getElementById('pesq-history-wrap');
    if (pesqPrivado) {
        btn.style.background = 'rgba(99,102,241,0.15)';
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = 'var(--primary)';
        lbl.textContent = 'Modo Privado ON';
        st.textContent = '⚡ Nada é guardado — pesquisa 100% anónima';
        st.style.color = 'var(--primary)';
        hw.style.display = 'none';
        showToast('🕶️ Modo Privado ativado — sem histórico', 'info');
    } else {
        btn.style.background = 'var(--surface)';
        btn.style.borderColor = 'var(--border)';
        btn.style.color = 'var(--text)';
        lbl.textContent = 'Modo Privado';
        st.textContent = 'Pesquisas são guardadas no histórico';
        st.style.color = 'var(--text-light)';
        hw.style.display = 'block';
        loadSearchHistory();
        showToast('Modo Privado desativado', 'info');
    }
}

async function doWebSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    const results = document.getElementById('search-results');
    results.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 12px;"></div>A pesquisar...</div>';

    if (!pesqPrivado && currentUser) {
        dbPush(`search_history/${currentUser.uid}`, { query: q, timestamp: Date.now() });
    }

    try {
        const r = await fetch('/api/ai/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q })
        });
        const data = await r.json();
        if (data.erro) { results.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${escapeHTML(data.erro)}</p></div>`; if(!pesqPrivado) loadSearchHistory(); return; }
        const items = data.resultados;
        results.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-light);margin-bottom:12px;">
                ${pesqPrivado ? '<span style="background:rgba(99,102,241,0.15);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">🕶️ PRIVADO</span>' : ''}
                <span>${items.length} resultados para "<strong>${escapeHTML(q)}</strong>"</span>
            </div>
            ${items.map(r => `
                <a href="${escapeHTML(r.href)}" target="_blank" rel="noopener noreferrer" style="display:block;padding:18px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;text-decoration:none;color:inherit;" onmouseover="this.style.borderColor='rgba(37,99,235,0.3)'" onmouseout="this.style.borderColor='var(--border)'">
                    <div style="font-size:15px;font-weight:600;color:var(--accent);margin-bottom:4px;">${escapeHTML(r.title)}</div>
                    <div style="font-size:13px;color:var(--text-light);line-height:1.5;margin-bottom:6px;">${escapeHTML(r.body)}</div>
                    <div style="font-size:11px;color:var(--primary);word-break:break-all;">${escapeHTML(r.href)}</div>
                </a>
            `).join('')}
        `;
        if(!pesqPrivado) loadSearchHistory();
    } catch(e) {
        results.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Erro na pesquisa</h3><p>Verifica a ligação e tenta novamente.</p></div>';
    }
}

async function loadSearchHistory() {
    const el = document.getElementById('search-history');
    if (!el || !currentUser || pesqPrivado) return;
    const snap = await dbGet(`search_history/${currentUser.uid}`);
    if (!snap) { el.innerHTML = '<div style="font-size:13px;color:var(--text-light);padding:12px;">Sem histórico.</div>'; return; }
    const entries = Object.entries(snap).sort((a,b) => (b[1].timestamp||0) - (a[1].timestamp||0)).slice(0, 20);
    el.innerHTML = entries.map(([id, h]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor='rgba(37,99,235,0.3)'" onmouseout="this.style.borderColor='var(--border)'" data-query="${escapeHTML(h.query)}" onclick="document.getElementById('search-input').value=this.dataset.query;doWebSearch();">
            <span style="font-size:13px;">🔍 ${escapeHTML(h.query)}</span>
            <span style="font-size:11px;color:var(--text-light);">${new Date(h.timestamp).toLocaleDateString('pt-PT')}</span>
        </div>
    `).join('');
}

async function clearSearchHistory() {
    if (!currentUser) return;
    if (!confirm('Limpar todo o histórico de pesquisas?')) return;
    await dbRemove(`search_history/${currentUser.uid}`);
    loadSearchHistory();
    showToast('Histórico limpo!');
}
