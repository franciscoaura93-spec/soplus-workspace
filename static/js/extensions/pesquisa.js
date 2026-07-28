// S&O+ Extension: Pesquisa Web + Browser v3.2 — embedded (server-fetched content in main window)
let pesqPrivado = false;
let pesqMode = 'search';
let brTabs = [];
let brActive = -1;
let brBookmarks = [];
let brAdBlock = true;

const BR_START = 'about:home';
const BR_HOME_ITEMS = [
    { name: 'Google', url: 'https://www.google.pt', icon: '🔍' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' },
    { name: 'Wikipedia', url: 'https://pt.wikipedia.org', icon: '📚' },
    { name: 'Quizlet', url: 'https://quizlet.com', icon: '🃏' },
    { name: 'Khan Academy', url: 'https://pt.khanacademy.org', icon: '🎓' },
    { name: 'DeepL', url: 'https://www.deepl.com/translator', icon: '🌐' },
    { name: 'Canva', url: 'https://www.canva.com', icon: '🎨' },
    { name: 'WolframAlpha', url: 'https://www.wolframalpha.com', icon: '🧮' },
    { name: 'GitHub', url: 'https://github.com', icon: '💻' },
    { name: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
    { name: 'Drive', url: 'https://drive.google.com', icon: '💾' },
    { name: 'Classroom', url: 'https://classroom.google.com', icon: '🏫' },
];
const BR_BLOCKED = ['doubleclick.net','googlesyndication.com','googleadservices.com','adnxs.com','adsrvr.org'];

// ═══════════════════════════════════════
//   MAIN RENDER
// ═══════════════════════════════════════
function renderPesquisa(area, ext) {
    pesqPrivado = false;
    pesqMode = 'search';
    brTabs = [{ url: BR_START, title: 'Início', loading: false }];
    brActive = 0;
    brBookmarks = JSON.parse(localStorage.getItem('br_bookmarks') || '[]');
    area.innerHTML = `
        <div class="page-header">
            <h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;">
                <button id="pesq-tab-search" onclick="pesqSetMode('search')" style="padding:6px 16px;border-radius:20px;border:1px solid var(--primary);background:rgba(99,102,241,0.12);color:var(--primary);font-size:12px;font-weight:700;cursor:pointer;">🔍 Pesquisa</button>
                <button id="pesq-tab-browser" onclick="pesqSetMode('browser')" style="padding:6px 16px;border-radius:20px;border:1px solid var(--border);background:var(--surface);color:var(--text-light);font-size:12px;font-weight:700;cursor:pointer;">🌐 Browser</button>
                <div style="flex:1;"></div>
                <button id="pesq-priv-btn" onclick="togglePesqPrivado()" style="display:flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;font-weight:600;cursor:pointer;">
                    🕶️ <span id="pesq-priv-label">Modo Privado</span>
                </button>
            </div>
            <div id="pesq-priv-status" style="font-size:10px;color:var(--text-light);margin-top:4px;">Pesquisas e navegação são guardadas no histórico</div>
        </div>
        <div id="pesq-search-panel">${_pesqSearchPanel()}</div>
        <div id="pesq-browser-panel" style="display:none;">${_pesqBrowserPanel()}</div>
    `;
    _pesqLoadHistory();
}

function pesqSetMode(m) {
    pesqMode = m;
    const sp = document.getElementById('pesq-search-panel');
    const bp = document.getElementById('pesq-browser-panel');
    const ts = document.getElementById('pesq-tab-search');
    const tb = document.getElementById('pesq-tab-browser');
    if (m === 'search') {
        sp.style.display = 'block'; bp.style.display = 'none';
        ts.style.cssText += 'border-color:var(--primary);background:rgba(99,102,241,0.12);color:var(--primary);';
        tb.style.cssText += 'border-color:var(--border);background:var(--surface);color:var(--text-light);';
    } else {
        sp.style.display = 'none'; bp.style.display = 'block';
        tb.style.cssText += 'border-color:var(--primary);background:rgba(99,102,241,0.12);color:var(--primary);';
        ts.style.cssText += 'border-color:var(--border);background:var(--surface);color:var(--text-light);';
    }
}

// ═══════════════════════════════════════
//   PRIVATE MODE
// ═══════════════════════════════════════
function togglePesqPrivado() {
    pesqPrivado = !pesqPrivado;
    const btn = document.getElementById('pesq-priv-btn');
    const lbl = document.getElementById('pesq-priv-label');
    const st  = document.getElementById('pesq-priv-status');
    const hw  = document.getElementById('pesq-history-wrap');
    if (pesqPrivado) {
        btn.style.background = 'rgba(99,102,241,0.15)'; btn.style.borderColor = 'var(--primary)'; btn.style.color = 'var(--primary)';
        lbl.textContent = 'Privado ON';
        st.innerHTML = '⚡ <strong>Proxy ativo</strong> · Sem histórico · Bloqueador de anúncios · IA integrada'; st.style.color = 'var(--primary)';
        if (hw) hw.style.display = 'none';
        showToast('🕶️ Modo Privado ativado', 'success');
    } else {
        btn.style.background = 'var(--surface)'; btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text)';
        lbl.textContent = 'Modo Privado';
        st.textContent = 'Pesquisas e navegação são guardadas no histórico'; st.style.color = 'var(--text-light)';
        if (hw) hw.style.display = 'block'; _pesqLoadHistory();
        showToast('Modo Privado desativado', 'info');
    }
}

// ═══════════════════════════════════════
//   SEARCH MODE
// ═══════════════════════════════════════
function _pesqSearchPanel() {
    return `
        <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;gap:12px;align-items:center;">
                <input class="form-input" id="search-input" placeholder="Pesquisar na web..." style="flex:1;" onkeydown="if(event.key==='Enter')doWebSearch()">
                <button class="btn btn-primary" onclick="doWebSearch()">🔍 Pesquisar</button>
            </div>
        </div>
        <div id="search-results"></div>
        <div id="pesq-history-wrap">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="font-size:14px;font-weight:700;">📋 Histórico</h3>
                <button class="btn btn-outline" onclick="clearSearchHistory()" style="font-size:11px;padding:4px 12px;">Limpar</button>
            </div>
            <div id="search-history"></div>
        </div>
    `;
}

async function doWebSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    const results = document.getElementById('search-results');
    results.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 12px;"></div>A pesquisar...</div>';
    if (!pesqPrivado && currentUser) dbPush(`search_history/${currentUser.uid}`, { query: q, timestamp: Date.now() });
    try {
        const r = await fetch('/api/ai/web-search', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({q}) });
        const data = await r.json();
        if (data.erro) { results.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${escapeHTML(data.erro)}</p></div>`; if(!pesqPrivado) _pesqLoadHistory(); return; }
        const items = data.resultados;
        results.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-light);margin-bottom:12px;">
                ${pesqPrivado ? '<span style="background:rgba(99,102,241,0.15);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">🕶️ PRIVADO</span>' : ''}
                <span>${items.length} resultados para "<strong>${escapeHTML(q)}</strong>"</span>
            </div>
            ${items.map(r => `
                <div onclick="pesqOpenResult('${escapeHTML(r.href).replace(/'/g,"\\'")}','${escapeHTML(r.title).replace(/'/g,"\\'")}')" style="display:block;padding:18px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(37,99,235,0.3)';this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
                    <div style="font-size:15px;font-weight:600;color:var(--accent);margin-bottom:4px;">${escapeHTML(r.title)}</div>
                    <div style="font-size:13px;color:var(--text-light);line-height:1.5;margin-bottom:6px;">${escapeHTML(r.body)}</div>
                    <div style="font-size:11px;color:var(--primary);word-break:break-all;">${escapeHTML(r.href)}</div>
                </div>
            `).join('')}
        `;
        if(!pesqPrivado) _pesqLoadHistory();
    } catch(e) {
        results.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Erro na pesquisa</h3><p>Verifica a ligação e tenta novamente.</p></div>';
    }
}

function pesqOpenResult(url, title) {
    brTabs[brActive] = { url, title: title || _brDomain(url), loading: true };
    pesqSetMode('browser');
    _pesqRefreshBrowser();
    _brOpenPage(url, title);
}

async function _pesqLoadHistory() {
    const el = document.getElementById('search-history');
    if (!el || !currentUser || pesqPrivado) return;
    const snap = await dbGet(`search_history/${currentUser.uid}`);
    if (!snap) { el.innerHTML = '<div style="font-size:13px;color:var(--text-light);padding:12px;">Sem histórico.</div>'; return; }
    const entries = Object.entries(snap).sort((a,b) => (b[1].timestamp||0) - (a[1].timestamp||0)).slice(0, 20);
    el.innerHTML = entries.map(([id, h]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;" onmouseover="this.style.borderColor='rgba(37,99,235,0.3)'" onmouseout="this.style.borderColor='var(--border)'" data-query="${escapeHTML(h.query)}" onclick="document.getElementById('search-input').value=this.dataset.query;doWebSearch();">
            <span style="font-size:13px;">🔍 ${escapeHTML(h.query)}</span>
            <span style="font-size:11px;color:var(--text-light);">${new Date(h.timestamp).toLocaleDateString('pt-PT')}</span>
        </div>
    `).join('');
}

async function clearSearchHistory() {
    if (!currentUser || !confirm('Limpar todo o histórico?')) return;
    await dbRemove(`search_history/${currentUser.uid}`);
    _pesqLoadHistory();
    showToast('Histórico limpo!');
}

// ═══════════════════════════════════════
//   BROWSER MODE — pywebview primary
// ═══════════════════════════════════════
function _pesqBrowserPanel() {
    const tab = brTabs[brActive] || brTabs[0];
    const isHome = !tab || tab.url === BR_START;
    return `
    <div style="display:flex;flex-direction:column;height:calc(100vh - 180px);overflow:hidden;border-radius:14px;border:1px solid var(--border);background:var(--bg);">
        <div style="display:flex;align-items:center;background:var(--surface);border-bottom:1px solid var(--border);padding:0 6px;gap:2px;min-height:36px;overflow-x:auto;">
            ${brTabs.map((t, i) => `
                <div onclick="brSwitch(${i})" style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px 8px 0 0;cursor:pointer;font-size:12px;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;${i===brActive ? 'background:var(--bg);font-weight:700;color:var(--accent);border:1px solid var(--border);border-bottom-color:var(--bg);' : 'color:var(--text-light);border:1px solid transparent;'}">
                    <span style="font-size:12px;">${t.url === BR_START ? '🏠' : '🌐'}</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHTML(t.title || 'Nova aba')}</span>
                    <span onclick="event.stopPropagation();brClose(${i})" style="margin-left:4px;font-size:13px;color:var(--text-light);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.color='var(--danger)'" onmouseout="this.style.background='';this.style.color='var(--text-light)'">✕</span>
                </div>
            `).join('')}
            <button onclick="brNewTab()" style="background:none;border:none;font-size:16px;cursor:pointer;padding:3px 8px;border-radius:6px;color:var(--text-light);">+</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--surface);border-bottom:1px solid var(--border);">
            <button onclick="brBack()" title="Voltar" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:var(--text-light);">◀</button>
            <button onclick="brForward()" title="Avançar" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:var(--text-light);">▶</button>
            <button onclick="brRefresh()" title="Atualizar" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:var(--text-light);">🔄</button>
            <div style="flex:1;display:flex;align-items:center;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:0 10px;">
                <span style="font-size:12px;margin-right:5px;">${isHome ? '🏠' : '🌐'}</span>
                <input id="br-url" value="${escapeHTML(tab?.url === BR_START ? '' : (tab?.url || ''))}" placeholder="Endereço ou pesquisa..." style="flex:1;border:none;background:none;padding:6px 0;font-size:12px;color:var(--text);outline:none;" onkeydown="if(event.key==='Enter')brNavigate(this.value)">
            </div>
            <button onclick="brToggleAdBlock()" title="Bloqueador" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;${brAdBlock ? 'color:var(--success);' : 'color:var(--text-light);'}">🛡️</button>
            <button onclick="brBookmarkPage()" title="Bookmark" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:${_brIsBookmarked(tab?.url) ? 'var(--accent)' : 'var(--text-light)'};">${_brIsBookmarked(tab?.url) ? '⭐' : '☆'}</button>
            <button onclick="brOpenNative()" title="Abrir em janela nativa Edge" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:var(--success);">🖥️</button>
            <button onclick="brReaderMode()" title="Reader Mode" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:var(--text-light);">📖</button>
            <button onclick="brAiSummarize()" title="Resumo IA" style="background:none;border:none;font-size:14px;cursor:pointer;padding:3px 6px;border-radius:6px;color:var(--text-light);">🤖</button>
        </div>
        <div id="br-content" style="flex:1;overflow:hidden;position:relative;">
            ${isHome ? _brRenderHome() : _brRenderEmbedded(tab)}
        </div>
    </div>
    <style>@keyframes brLoad{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}</style>
    `;
}

function _brRenderHome() {
    return `
    <div style="height:100%;overflow-y:auto;padding:24px 16px;">
        <div style="text-align:center;margin-bottom:22px;">
            <div style="font-size:26px;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">S&O+ Browser</div>
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">
                <span style="background:rgba(34,197,94,0.15);color:var(--success);padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;">🌐 Servidor local — conteúdo real</span>
            </div>
        </div>
        <div style="max-width:460px;margin:0 auto;">
            <div style="display:flex;align-items:center;background:var(--surface);border:2px solid var(--border);border-radius:12px;padding:4px 6px;margin-bottom:20px;">
                <span style="padding:0 8px;font-size:16px;">🔍</span>
                <input id="br-home-search" placeholder="Pesquisa ou endereço..." style="flex:1;border:none;background:none;padding:8px 0;font-size:14px;color:var(--text);outline:none;" onkeydown="if(event.key==='Enter')brNavigate(this.value)">
                <button class="btn btn-primary" onclick="brNavigate(document.getElementById('br-home-search').value)" style="padding:7px 14px;border-radius:8px;font-size:12px;">Ir</button>
            </div>
            <div style="font-size:11px;font-weight:700;color:var(--text-light);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Acesso rápido</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:20px;">
                ${BR_HOME_ITEMS.map(h => `
                    <div onclick="brNavigate('${h.url}')" style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
                        <div style="font-size:24px;margin-bottom:4px;">${h.icon}</div>
                        <div style="font-size:11px;font-weight:600;">${h.name}</div>
                    </div>
                `).join('')}
            </div>
            ${brBookmarks.length > 0 ? `
                <div style="font-size:11px;font-weight:700;color:var(--text-light);margin-bottom:8px;text-transform:uppercase;">⭐ Bookmarks</div>
                <div style="display:flex;flex-direction:column;gap:5px;">
                    ${brBookmarks.map((b, i) => `
                        <div onclick="brNavigate('${escapeHTML(b.url)}')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                            <span>⭐</span><span style="font-size:12px;font-weight:600;flex:1;">${escapeHTML(b.name)}</span>
                            <span onclick="event.stopPropagation();brRemoveBookmark(${i})" style="font-size:11px;color:var(--danger);cursor:pointer;">✕</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    </div>`;
}

// ─── Embedded mode: iframe with server-fetched content ───
function _brRenderEmbedded(tab) {
    const blocked = brAdBlock && BR_BLOCKED.some(d => tab.url.includes(d));
    return `
    <div style="height:100%;display:flex;flex-direction:column;">
        ${tab.loading ? '<div style="height:3px;background:var(--border);overflow:hidden;"><div style="height:100%;width:40%;background:linear-gradient(90deg,transparent,var(--primary),transparent);animation:brLoad 1.2s infinite;"></div></div>' : ''}
        ${blocked ? '<div style="padding:5px 10px;background:rgba(34,197,94,0.1);border-bottom:1px solid rgba(34,197,94,0.2);font-size:10px;color:var(--success);text-align:center;">🛡️ Anúncios bloqueados</div>' : ''}
        <div style="flex:1;position:relative;">
            ${tab.html
                ? `<iframe id="br-iframe" srcdoc="${encodeURIComponent(tab.html)}" style="width:100%;height:100%;border:none;"></iframe>`
                : tab.error
                    ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:30px;">
                        <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
                        <h3 style="font-size:16px;margin-bottom:6px;">Erro ao carregar</h3>
                        <p style="font-size:12px;color:var(--text-light);margin-bottom:16px;">${escapeHTML(tab.error)}</p>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
                            <button class="btn btn-primary" onclick="brRefresh()" style="font-size:11px;">🔄 Tentar novamente</button>
                            <button class="btn btn-outline" onclick="brTryProxy()" style="font-size:11px;">🔌 Tentar com proxy</button>
                        </div>
                    </div>`
                    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-light);">A carregar...</div>`
            }
        </div>
    </div>`;
}

// ═══════════════════════════════════════
//   TAB + NAVIGATION
// ═══════════════════════════════════════
function brNewTab() { brTabs.push({ url: BR_START, title: 'Nova aba', loading: false }); brActive = brTabs.length - 1; _pesqRefreshBrowser(); }
function brSwitch(i) { brActive = i; _pesqRefreshBrowser(); }
function brClose(i) { if (brTabs.length <= 1) return; brTabs.splice(i, 1); if (brActive >= brTabs.length) brActive = brTabs.length - 1; _pesqRefreshBrowser(); }

function brNavigate(raw) {
    if (!raw || !raw.trim()) return;
    let url = raw.trim();
    if (!url.match(/^https?:\/\//i)) {
        if (url.includes('.') && !url.includes(' ')) url = 'https://' + url;
        else url = 'https://www.google.pt/search?q=' + encodeURIComponent(url);
    }
    brTabs[brActive] = { url, title: _brDomain(url), loading: true };
    _pesqRefreshBrowser();
    _brOpenPage(url, _brDomain(url));
}

async function _brOpenPage(url, title) {
    // Fetch HTML from server for iframe rendering
    try {
        const r = await fetch('/api/browse?url=' + encodeURIComponent(url) + '&mode=auto');
        const data = await r.json();
        if (data.html) {
            brTabs[brActive] = { ...brTabs[brActive], html: data.html, title: data.title || brTabs[brActive].title, loading: false, finalUrl: data.url };
        } else {
            brTabs[brActive] = { ...brTabs[brActive], loading: false, error: data.error || 'Erro ao carregar' };
        }
    } catch(e) {
        brTabs[brActive] = { ...brTabs[brActive], loading: false, error: 'Erro de ligação' };
    }
    if (!pesqPrivado && currentUser) dbPush(`browser_history/${currentUser.uid}`, { url, title: title||url, timestamp: Date.now() });
    _pesqRefreshBrowser();
}

function brGoHome() { brTabs[brActive] = { url: BR_START, title: 'Início', loading: false }; _pesqRefreshBrowser(); }

async function brTryProxy() {
    const tab = brTabs[brActive];
    if (!tab || !tab.url) return;
    brTabs[brActive] = { ...tab, loading: true, error: null };
    _pesqRefreshBrowser();
    try {
        const r = await fetch('/api/proxy?url=' + encodeURIComponent(tab.url));
        const data = await r.json();
        if (data.html) {
            brTabs[brActive] = { ...brTabs[brActive], html: data.html, title: data.title || tab.title, loading: false, finalUrl: data.url || tab.url };
        } else {
            brTabs[brActive] = { ...brTabs[brActive], loading: false, error: data.error || 'Proxy falhou' };
        }
    } catch(e) {
        brTabs[brActive] = { ...brTabs[brActive], loading: false, error: 'Proxy indisponível' };
    }
    _pesqRefreshBrowser();
}

function brBack() { window.history.back(); }
function brForward() { window.history.forward(); }

function brRefresh() {
    const tab = brTabs[brActive];
    if (!tab || tab.url === BR_START) return;
    brTabs[brActive] = { ...tab, loading: true, error: null, html: null };
    _pesqRefreshBrowser();
    _brOpenPage(tab.url, tab.title);
}

function _brDomain(u) { try { return new URL(u).hostname.replace('www.',''); } catch(e) { return u.slice(0,30); } }
function _pesqRefreshBrowser() { const bp = document.getElementById('pesq-browser-panel'); if (bp) bp.innerHTML = _pesqBrowserPanel(); }

// ═══════════════════════════════════════
//   BOOKMARKS
// ═══════════════════════════════════════
function _brIsBookmarked(url) { return url && url !== BR_START && brBookmarks.some(b => b.url === url); }
function brBookmarkPage() {
    const tab = brTabs[brActive]; if(!tab || tab.url===BR_START) return;
    if (_brIsBookmarked(tab.url)) { brBookmarks = brBookmarks.filter(b => b.url !== tab.url); showToast('Bookmark removido','info'); }
    else { brBookmarks.push({ name: tab.title||_brDomain(tab.url), url: tab.url }); showToast('⭐ Bookmark guardado!','success'); }
    localStorage.setItem('br_bookmarks', JSON.stringify(brBookmarks)); _pesqRefreshBrowser();
}
function brRemoveBookmark(i) { brBookmarks.splice(i,1); localStorage.setItem('br_bookmarks',JSON.stringify(brBookmarks)); showToast('Bookmark removido','info'); _pesqRefreshBrowser(); }

// ─── Native window ───
async function brOpenNative() {
    const tab = brTabs[brActive];
    if (!tab || tab.url === BR_START) { showToast('Abre uma página primeiro','warning'); return; }
    try {
        const r = await fetch('/api/browser/open-native', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ url: tab.url, title: tab.title || '' })
        });
        const data = await r.json();
        if (data.ok) {
            showToast('🖥️ Aberto em janela nativa Edge','success');
        } else {
            showToast('Erro: ' + (data.error || 'Desconhecido'), 'warning');
        }
    } catch(e) {
        showToast('Erro ao abrir janela nativa','warning');
    }
}

// ─── Ad blocker ───
function brToggleAdBlock() { brAdBlock = !brAdBlock; showToast(brAdBlock ? '🛡️ Bloqueador ON' : 'Bloqueador OFF', brAdBlock?'success':'info'); }

// ═══════════════════════════════════════
//   AI SUMMARIZE — works in all modes
// ═══════════════════════════════════════
async function brAiSummarize() {
    const tab = brTabs[brActive];
    if (!tab || tab.url === BR_START) { showToast('Abre um site primeiro','warning'); return; }

    // Extract text from URL
    let text = '';
    let title = tab.title || '';

    // Try iframe first (embedded mode)
    const iframe = document.getElementById('br-iframe');
    if (iframe) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            text = Array.from(doc.querySelectorAll('p,h1,h2,h3,li')).map(e => e.innerText).filter(t => t.length > 15).join('\n').slice(0, 4000);
        } catch(e) {}
    }

    // Fallback: extract from URL server-side
    if (!text) {
        try {
            const r = await fetch('/api/browser/extract', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ url: tab.url })
            });
            const data = await r.json();
            text = data.text || '';
            title = data.title || title;
        } catch(e) {}
    }

    if (!text) { showToast('Sem conteúdo para resumir','warning'); return; }

    _brShowAiOverlay(text, title, 'resumir');
}

function _brShowAiOverlay(text, title, action) {
    const labels = { resumir: '📝 Resumo', traduzir: '🌐 Tradução', explicar: '🎓 Explicação', pontos: '📋 Pontos-chave' };
    const prompts = {
        resumir: `Resume este conteúdo em 5-8 pontos principais, em português:\n\n${text.slice(0, 4000)}`,
        traduzir: `Traduz este conteúdo para português de Portugal:\n\n${text.slice(0, 4000)}`,
        explicar: `Explica este conteúdo como professor, de forma clara e didática:\n\n${text.slice(0, 4000)}`,
        pontos: `Extrai os pontos-chave e factos importantes em formato de lista:\n\n${text.slice(0, 4000)}`
    };

    let ov = document.getElementById('br-ai-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'br-ai-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <span style="font-size:14px;font-weight:700;">🤖 IA — ${escapeHTML(title || 'Página')}</span>
                <button onclick="document.getElementById('br-ai-overlay').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-light);">✕</button>
            </div>
            <div id="br-ai-result" style="font-size:13px;color:var(--text);line-height:1.7;">
                <div style="text-align:center;padding:20px;"><div class="spinner" style="margin:0 auto 10px;"></div>A gerar ${labels[action]}...</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="_brAiAction('resumir',\`${text.slice(0,200).replace(/`/g,"'")}\`)" style="font-size:11px;flex:1;">📝 Resumir</button>
                <button class="btn btn-outline" onclick="_brAiAction('traduzir',\`${text.slice(0,200).replace(/`/g,"'")}\`)" style="font-size:11px;flex:1;">🌐 Traduzir</button>
                <button class="btn btn-outline" onclick="_brAiAction('explicar',\`${text.slice(0,200).replace(/`/g,"'")}\`)" style="font-size:11px;flex:1;">🎓 Explicar</button>
                <button class="btn btn-outline" onclick="_brAiAction('pontos',\`${text.slice(0,200).replace(/`/g,"'")}\`)" style="font-size:11px;flex:1;">📋 Pontos</button>
            </div>
        </div>
    `;
    document.body.appendChild(ov);
    _brAiAction(action, text);
}

async function _brAiAction(action, presetText) {
    const resEl = document.getElementById('br-ai-result');
    if (!resEl) return;
    let text = presetText;
    const labels = { resumir: '📝 Resumo', traduzir: '🌐 Tradução', explicar: '🎓 Explicação', pontos: '📋 Pontos-chave' };
    const prompts = {
        resumir: `Resume este conteúdo em 5-8 pontos principais, em português:\n\n${text.slice(0, 4000)}`,
        traduzir: `Traduz este conteúdo para português de Portugal:\n\n${text.slice(0, 4000)}`,
        explicar: `Explica este conteúdo como professor, de forma clara e didática:\n\n${text.slice(0, 4000)}`,
        pontos: `Extrai os pontos-chave e factos importantes em formato de lista:\n\n${text.slice(0, 4000)}`
    };
    resEl.innerHTML = `<div style="text-align:center;padding:20px;"><div class="spinner" style="margin:0 auto 10px;"></div>A gerar ${labels[action]}...</div>`;
    try {
        const r = await fetch('/api/ai/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: prompts[action] })
        });
        const data = await r.json();
        if (data.resposta) {
            resEl.innerHTML = `
                <div style="font-size:10px;font-weight:700;color:var(--primary);margin-bottom:10px;">${labels[action]}</div>
                ${data.resposta.split('\n').map(l => `<p style="margin-bottom:6px;">${escapeHTML(l)}</p>`).join('')}
            `;
        } else {
            resEl.innerHTML = `<span style="color:var(--danger);">Erro: ${escapeHTML(data.erro || 'Resposta vazia')}</span>`;
        }
    } catch(e) {
        resEl.innerHTML = `<span style="color:var(--danger);">Erro de ligação</span>`;
    }
}

// ═══════════════════════════════════════
//   READER MODE — works in all modes
// ═══════════════════════════════════════
async function brReaderMode() {
    const tab = brTabs[brActive];
    if (!tab || tab.url === BR_START) { showToast('Abre um site primeiro','warning'); return; }

    let body = '';
    let title = tab.title || '';

    // Try iframe
    const iframe = document.getElementById('br-iframe');
    if (iframe) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            title = doc.querySelector('h1,h2,.title')?.innerText || doc.title || title;
            body = Array.from(doc.querySelectorAll('p,h1,h2,h3,h4,li,blockquote')).map(el => {
                const t = el.tagName.toLowerCase();
                if(t==='h1') return `<h1 style="font-size:26px;font-weight:800;margin:18px 0 8px;">${el.innerText}</h1>`;
                if(t==='h2') return `<h2 style="font-size:20px;font-weight:700;margin:14px 0 6px;">${el.innerText}</h2>`;
                if(t==='h3') return `<h3 style="font-size:16px;font-weight:600;margin:12px 0 5px;">${el.innerText}</h3>`;
                if(t==='blockquote') return `<blockquote style="border-left:3px solid var(--primary);padding-left:14px;color:var(--text-light);font-style:italic;margin:10px 0;">${el.innerText}</blockquote>`;
                if(t==='li') return `<li style="margin-bottom:3px;">${el.innerText}</li>`;
                return `<p style="margin-bottom:10px;line-height:1.8;">${el.innerText}</p>`;
            }).filter(p => p.length > 20).join('');
        } catch(e) {}
    }

    // Fallback: extract from URL
    if (!body) {
        try {
            const r = await fetch('/api/browser/extract', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ url: tab.url })
            });
            const data = await r.json();
            title = data.title || title;
            body = (data.text || '').split('.').filter(s => s.trim().length > 20)
                .map(s => `<p style="margin-bottom:10px;line-height:1.8;">${escapeHTML(s.trim())}.</p>`).join('');
        } catch(e) {}
    }
    if (!body) { showToast('Sem conteúdo legível','warning'); return; }

    const ov = document.createElement('div');
    ov.id = 'br-reader-overlay'; ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg);overflow-y:auto;';
    ov.innerHTML = `<div style="max-width:660px;margin:0 auto;padding:36px 20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <span style="font-size:11px;background:rgba(99,102,241,0.15);color:var(--primary);padding:3px 10px;border-radius:20px;font-weight:600;">📖 Reader Mode</span>
            <button onclick="document.getElementById('br-reader-overlay')?.remove()" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px;color:var(--text);">✕ Fechar</button>
        </div>
        <h1 style="font-size:28px;font-weight:800;line-height:1.3;margin-bottom:6px;">${escapeHTML(title)}</h1>
        <div style="font-size:12px;color:var(--text-light);margin-bottom:24px;">${escapeHTML(tab.url)}</div>
        <div style="font-size:15px;line-height:1.8;color:var(--text);">${body}</div>
    </div>`;
    document.body.appendChild(ov);
}
