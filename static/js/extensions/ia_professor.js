// S&O+ Extension: IA Professor
function renderIAProfessor(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">🤖 Correção Automática</h3>
            <div class="field"><label>Disciplina</label><input id="prof-subject" placeholder="Ex: Português"></div>
            <div class="field"><label>Pergunta / Enunciado</label><textarea id="prof-question" placeholder="Ex: Qual é a capital de Portugal?"></textarea></div>
            <div class="field"><label>Resposta do Aluno</label><textarea id="prof-answer" placeholder="Ex: Lisboa"></textarea></div>
            <div class="field"><label>Resposta Correta</label><input id="prof-correct" placeholder="Ex: Lisboa"></div>
            <button class="btn btn-primary" onclick="correctAnswer()">📝 Corrigir com IA</button>
        </div>
        <div id="prof-result"></div>
    `;
}
async function correctAnswer() {
    const q=document.getElementById('prof-question').value.trim();
    const a=document.getElementById('prof-answer').value.trim();
    const c=document.getElementById('prof-correct').value.trim();
    const sub=document.getElementById('prof-subject').value.trim();
    if(!q||!a||!c){showToast('Preenche todos os campos','error');return;}
    const el=document.getElementById('prof-result');el.innerHTML='<div style="text-align:center;padding:16px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 8px;"></div>A corrigir...</div>';
    try{
        const text=await callAI(`Corrige esta resposta de um aluno de ${sub||'disciplina'}.\nPergunta: ${q}\nResposta do aluno: ${a}\nResposta correta: ${c}\n\nDá: nota (0-20), justificação, e feedback personalizado ao aluno. Usa emojis.`);
        el.innerHTML=`<div class="card" style="white-space:pre-wrap;line-height:1.8;">${text}</div>`;
    }catch(e){el.innerHTML=`<span style="color:var(--danger)">${e.message}</span>`;}
}
