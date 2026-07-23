// S&O+ Extension: Gravacao Prof
function renderGravacaoProf(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">🎤 Gravação de Áudio</h3>
            <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">Grava explicações e feedback em áudio para os teus alunos.</p>
            <div class="form-group"><label>Título da Gravação</label><input id="audio-title" placeholder="Ex: Explicação Capítulo 5"></div>
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <button class="btn btn-primary" id="audio-rec-btn" onclick="startAudioRec()">⏺️ Iniciar</button>
                <button class="btn btn-danger" id="audio-stop-btn" onclick="stopAudioRec()" style="display:none;">⏹️ Parar</button>
            </div>
            <div id="audio-status" style="font-size:13px;color:var(--text-light);"></div>
            <div id="audio-timer" style="font-size:28px;font-weight:700;text-align:center;margin:12px 0;display:none;">00:00</div>
        </div>
        <div class="card"><h3 style="margin-bottom:12px;">📂 Gravações de Áudio</h3><div id="audio-list"><p style="font-size:13px;color:var(--text-light);">Sem gravações.</p></div></div>
    `;
    loadAudioRecordings();
}
let _audioRec=null,_audioChunks=[],_audioTimer=null,_audioSeconds=0;
function startAudioRec() {
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
        _audioChunks=[];_audioRec=new MediaRecorder(stream);_audioSeconds=0;
        _audioRec.ondataavailable=e=>{if(e.data.size>0)_audioChunks.push(e.data);};
        _audioRec.onstop=()=>{
            const blob=new Blob(_audioChunks,{type:'audio/webm'});
            const title=document.getElementById('audio-title').value||'Áudio';
            if(currentUser){dbPush(`audio_recordings/${currentUser.uid}`,{name:title,size:blob.size,timestamp:Date.now()});}
            stream.getTracks().forEach(t=>t.stop());
            document.getElementById('audio-rec-btn').style.display='';document.getElementById('audio-stop-btn').style.display='none';
            document.getElementById('audio-timer').style.display='none';
            document.getElementById('audio-status').innerHTML='✅ Gravação guardada!';loadAudioRecordings();
        };
        _audioRec.start();
        document.getElementById('audio-rec-btn').style.display='none';document.getElementById('audio-stop-btn').style.display='';
        document.getElementById('audio-timer').style.display='block';document.getElementById('audio-status').innerHTML='🔴 A gravar...';
        _audioTimer=setInterval(()=>{_audioSeconds++;const m=String(Math.floor(_audioSeconds/60)).padStart(2,'0'),s=String(_audioSeconds%60).padStart(2,'0');document.getElementById('audio-timer').textContent=`${m}:${s}`;},1000);
    }).catch(e=>{document.getElementById('audio-status').innerHTML=`<span style="color:var(--danger)">❌ ${e.message}</span>`;});
}
function stopAudioRec() {if(_audioRec&&_audioRec.state==='recording'){_audioRec.stop();clearInterval(_audioTimer);}}
async function loadAudioRecordings() {
    if(!currentUser)return;const snap=await dbGet(`audio_recordings/${currentUser.uid}`);
    const el=document.getElementById('audio-list');if(!snap){el.innerHTML='<p style="font-size:13px;color:var(--text-light);">Sem gravações.</p>';return;}
    const entries=Object.entries(snap).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0));
    el.innerHTML=entries.map(([id,r])=>`<div style="padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><div><strong>🎤 ${r.name}</strong><br><span style="font-size:11px;color:var(--text-light);">${new Date(r.timestamp).toLocaleDateString('pt-PT')}</span></div><button class="btn btn-outline" onclick="dbRemove('audio_recordings/${currentUser.uid}/${id}');loadAudioRecordings();">🗑️</button></div>`).join('');
}
