// S&O+ Extension: Exames
function renderExames(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">📚 Gerar Exame com IA</h3>
            <div class="field"><label>Disciplina</label><input id="exam-subject" placeholder="Ex: Matemática"></div>
            <div class="field"><label>Tema</label><input id="exam-topic" placeholder="Ex: Equações do 2º grau"></div>
            <div class="field"><label>Nº de Questões</label><select id="exam-num" class="form-input"><option>5</option><option>10</option><option>15</option><option>20</option></select></div>
            <button class="btn btn-primary" onclick="generateExam()">📝 Gerar Exame</button>
        </div>
        <div id="exam-result"></div>
    `;
}
async function generateExam() {
    const subject=document.getElementById('exam-subject').value.trim();
    const topic=document.getElementById('exam-topic').value.trim();
    const num=document.getElementById('exam-num').value;
    if(!subject){showToast('Indica a disciplina','error');return;}
    const el=document.getElementById('exam-result');el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 8px;"></div>A gerar exame...</div>';
    try{
        const text=await callAI(`Gera um exame de ${subject} sobre ${topic||'temas gerais'} com ${num} questões. Inclui: enunciado de cada questão, opções (se múltipla escolha) e respostas corretas no final. Formato limpo e organizado.`);
        el.innerHTML=`<div class="card" style="white-space:pre-wrap;line-height:1.8;">${text}</div><button class="btn btn-outline" style="margin-top:12px;" onclick="generateExam()">🔄 Gerar outro</button>`;
    }catch(e){el.innerHTML=`<span style="color:var(--danger)">${e.message}</span>`;}
}
