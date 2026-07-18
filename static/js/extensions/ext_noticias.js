// S&O+ Extension: Noticias
function renderNoticias(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div id="noticias-content"><div style="text-align:center;padding:40px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 12px;"></div>A carregar notícias...</div></div>
    `;
    loadNoticias();
}

async function loadNoticias() {
    const el = document.getElementById('noticias-content');
    try {
        const r = await fetch('/api/ai/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await r.json();
        if (data.erro) { el.innerHTML = `<div class="empty-state"><p>${data.erro}</p></div>`; return; }
        const items = data.noticias;
        el.innerHTML = items.map(n => `
            <div style="padding:18px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div style="font-size:15px;font-weight:600;flex:1;">${n.title}</div>
                    <span style="font-size:11px;color:var(--text-light);white-space:nowrap;margin-left:12px;">${n.source || ''}</span>
                </div>
                <div style="font-size:13px;color:var(--text-light);line-height:1.5;margin-bottom:6px;">${n.body}</div>
                ${n.url ? `<a href="${n.url}" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none;">🔗 Ler mais</a>` : ''}
            </div>
        `).join('');
    } catch(e) { el.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>Erro ao carregar notícias</p></div>'; }
}
