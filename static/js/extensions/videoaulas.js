// S&O+ Extension: Videoaulas
function renderVideoaulas(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card" style="margin-bottom:16px;">
            <h3 style="margin-bottom:12px;">🎙️ Gravar Videoaula</h3>
            <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">Grava o teu ecrã com áudio para criar videoaulas.</p>
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <button class="btn btn-primary" id="rec-btn" onclick="startScreenRec()">⏺️ Iniciar Gravação</button>
                <button class="btn btn-danger" id="stop-rec-btn" onclick="stopScreenRec()" style="display:none;">⏹️ Parar</button>
            </div>
            <div id="rec-status" style="font-size:13px;color:var(--text-light);"></div>
            <video id="rec-preview" style="width:100%;max-height:300px;border-radius:8px;margin-top:12px;display:none;" controls></video>
        </div>
        <div class="card">
            <h3 style="margin-bottom:12px;">📂 Gravações Guardadas</h3>
            <div id="recordings-list"><p style="font-size:13px;color:var(--text-light);">Sem gravações ainda.</p></div>
        </div>
    `;
    loadRecordings();
}
let _screenRec=null,_screenChunks=[];
function startScreenRec() {
    navigator.mediaDevices.getDisplayMedia({video:true,audio:true}).then(stream=>{
        _screenChunks=[];_screenRec=new MediaRecorder(stream);
        _screenRec.ondataavailable=e=>{if(e.data.size>0)_screenChunks.push(e.data);};
        _screenRec.onstop=()=>{
            const blob=new Blob(_screenChunks,{type:'video/webm'});
            const url=URL.createObjectURL(blob);
            const vid=document.getElementById('rec-preview');vid.src=url;vid.style.display='block';
            if(currentUser){dbPush(`recordings/${currentUser.uid}`,{name:'Videoaula',url:url,size:blob.size,timestamp:Date.now()});}
            document.getElementById('rec-btn').style.display='';document.getElementById('stop-rec-btn').style.display='none';
            document.getElementById('rec-status').innerHTML='✅ Gravação terminada!';
            loadRecordings();
        };
        _screenRec.start();
        document.getElementById('rec-btn').style.display='none';document.getElementById('stop-rec-btn').style.display='';
        document.getElementById('rec-status').innerHTML='🔴 A gravar...';
    }).catch(e=>{document.getElementById('rec-status').innerHTML=`<span style="color:var(--danger)">❌ ${e.message}</span>`;});
}
function stopScreenRec() {if(_screenRec&&_screenRec.state==='recording')_screenRec.stop();}
async function loadRecordings() {
    if(!currentUser)return;const snap=await dbGet(`recordings/${currentUser.uid}`);
    const el=document.getElementById('recordings-list');if(!snap){el.innerHTML='<p style="font-size:13px;color:var(--text-light);">Sem gravações ainda.</p>';return;}
    const entries=Object.entries(snap).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0));
    el.innerHTML=entries.map(([id,r])=>`<div style="padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><div><strong>${r.name}</strong><br><span style="font-size:11px;color:var(--text-light);">${new Date(r.timestamp).toLocaleDateString('pt-PT')}</span></div><button class="btn btn-outline" onclick="deleteRec('${id}')">🗑️</button></div>`).join('');
}
function deleteRec(id) {if(currentUser){dbRemove(`recordings/${currentUser.uid}/${id}`);loadRecordings();}}
