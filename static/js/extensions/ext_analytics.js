// S&O+ Extension: Analytics
function renderAnalytics(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">📊 As Tuas Estatísticas</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;" id="analytics-stats"></div>
        </div>
        <div class="card">
            <h3 style="margin-bottom:12px;">📈 Atividade Recente</h3>
            <canvas id="analytics-chart" style="max-height:250px;"></canvas>
        </div>
    `;
    loadAnalytics();
}
async function loadAnalytics() {
    const el=document.getElementById('analytics-stats');if(!currentUser){el.innerHTML='<p style="color:var(--text-light)">Inicia sessão.</p>';return;}
    const notesSnap=await dbGet(`notas/${currentUser.uid}`);
    const worksSnap=await dbGet('works');
    const myWorks=worksSnap?Object.values(worksSnap).filter(w=>w.userId===currentUser.uid):[];
    const notesCount=notesSnap?Object.keys(notesSnap).length:0;
    const avg=notesSnap?Object.values(notesSnap).reduce((s,n)=>s+(parseFloat(n.nota)||0),0)/notesCount:0;
    el.innerHTML=`
        <div style="padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;text-align:center;"><div style="font-size:24px;font-weight:700;color:var(--accent);">${notesCount}</div><div style="font-size:11px;color:var(--text-light);margin-top:4px;">Notas Registadas</div></div>
        <div style="padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;text-align:center;"><div style="font-size:24px;font-weight:700;color:${avg>=10?'var(--success)':'var(--danger)'};">${avg>0?avg.toFixed(1):'-'}</div><div style="font-size:11px;color:var(--text-light);margin-top:4px;">Média Geral</div></div>
        <div style="padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;text-align:center;"><div style="font-size:24px;font-weight:700;color:var(--primary);">${myWorks.length}</div><div style="font-size:11px;color:var(--text-light);margin-top:4px;">Trabalhos Entregues</div></div>
    `;
}
