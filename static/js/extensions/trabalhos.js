// S&O+ Extension: Trabalhos
function renderTrabalhos(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">📤 Submeter Trabalho</h3>
            <div class="field"><label>Nome do Trabalho</label><input id="work-name" placeholder="Ex: Relatório de Ciências"></div>
            <div class="field"><label>Disciplina</label><input id="work-subject" placeholder="Ex: Ciências Naturais"></div>
            <div class="field"><label>Descrição</label><textarea id="work-desc" placeholder="Descreve o trabalho..."></textarea></div>
            <div class="field"><label>Anexar ficheiro</label><input type="file" id="work-file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip"></div>
            <button class="btn btn-primary" onclick="submitWork()">📤 Submeter</button>
        </div>
        <div class="card">
            <h3 style="margin-bottom:12px;">📂 Trabalhos Submetidos</h3>
            <div id="works-list"><p style="font-size:13px;color:var(--text-light);">Sem trabalhos ainda.</p></div>
        </div>
    `;
    loadWorks();
}
async function submitWork() {
    const name=document.getElementById('work-name').value.trim();
    const subject=document.getElementById('work-subject').value.trim();
    const desc=document.getElementById('work-desc').value.trim();
    if(!name||!subject){showToast('Preenche nome e disciplina','error');return;}
    const file=document.getElementById('work-file').files[0];
    const work={name,subject,desc,timestamp:Date.now(),userId:currentUser?.uid,userName:currentUser?.displayName||currentUser?.email||'Aluno'};
    if(file){
        const reader=new FileReader();
        reader.onload=()=>{work.fileName=file.name;work.fileData=reader.result;work.fileSize=file.size;dbPush('works',work);loadWorks();showToast('Trabalho submetido!');};
        reader.readAsDataURL(file);
    }else{dbPush('works',work);loadWorks();showToast('Trabalho submetido!');}
}
async function loadWorks() {
    const snap=await dbGet('works');const el=document.getElementById('works-list');if(!snap){el.innerHTML='<p style="font-size:13px;color:var(--text-light);">Sem trabalhos ainda.</p>';return;}
    const entries=Object.entries(snap).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0));
    el.innerHTML=entries.map(([id,w])=>`<div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;"><div><strong>📄 ${w.name}</strong><br><span style="font-size:12px;color:var(--text-light);">${w.subject} • ${w.userName} • ${new Date(w.timestamp).toLocaleDateString('pt-PT')}</span>${w.desc?`<p style="font-size:12px;color:var(--text-dim);margin-top:6px;">${w.desc}</p>`:''}${w.fileName?`<p style="font-size:11px;color:var(--accent);margin-top:4px;">📎 ${w.fileName}</p>`:''}</div>${w.fileData?`<a href="${w.fileData}" download="${w.fileName||'trabalho'}" class="btn btn-outline" style="height:fit-content;">⬇️</a>`:''}</div></div>`).join('');
}
