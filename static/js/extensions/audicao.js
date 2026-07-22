// S&O+ Extension: Audicao
function renderAudicao(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">🎧 Exercícios de Audição</h3>
            <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">A IA gera exercícios de audição e compreensão oral.</p>
            <div class="field"><label>Disciplina</label><select id="aud-subject" class="form-input"><option value="Português">Português</option><option value="Inglês">Inglês</option><option value="Espanhol">Espanhol</option><option value="Francês">Francês</option></select></div>
            <div class="field"><label>Nível</label><select id="aud-level" class="form-input"><option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option></select></div>
            <button class="btn btn-primary" onclick="generateAudition()">🎧 Gerar Exercício</button>
        </div>
        <div id="aud-exercise" style="margin-top:12px;"></div>
    `;
}
async function generateAudition() {
    const subject=document.getElementById('aud-subject').value;
    const level=document.getElementById('aud-level').value;
    const el=document.getElementById('aud-exercise');el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 8px;"></div>A gerar exercício...</div>';
    try{
        const text=await callAI(`Gera um exercício de audição para ${subject} nível ${level}. Inclui: 1) Texto para ler em voz alta 2) 3 perguntas de compreensão 3) Respostas. Formato limpo.`);
        el.innerHTML=`<div class="card" style="white-space:pre-wrap;line-height:1.8;">${text}</div><button class="btn btn-outline" style="margin-top:12px;" onclick="generateAudition()">🔄 Outro exercício</button>`;
    }catch(e){el.innerHTML=`<span style="color:var(--danger)">${e.message}</span>`;}
}
