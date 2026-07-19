// S&O+ Extension: Calendario
function renderCalendario(area, ext) {
    if (!window._calDate) window._calDate = new Date();
    const dt = window._calDate;
    const month = dt.toLocaleString('pt-PT', {month:'long', year:'numeric'});
    const firstDay = new Date(dt.getFullYear(), dt.getMonth(), 1).getDay();
    const daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = dt.getMonth() === today.getMonth() && dt.getFullYear() === today.getFullYear();
    let days = '';
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay-1); i++) days += '<div style="aspect-ratio:1;"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = isCurrentMonth && d === today.getDate();
        days += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:14px;cursor:pointer;transition:all 0.2s;${isToday ? 'background:var(--primary);color:#fff;font-weight:700;box-shadow:0 0 12px rgba(37,99,235,0.3);' : 'background:var(--surface);border:1px solid var(--border);'}" onmouseover="if(!this.style.background.includes('rgb(37'))this.style.borderColor='rgba(37,99,235,0.4)'" onmouseout="if(!this.style.background.includes('rgb(37'))this.style.borderColor='var(--border)'">${d}</div>`;
    }
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <button class="btn btn-outline" onclick="calNav(-1)" style="font-size:18px;padding:8px 14px;">◀</button>
                <div style="text-align:center;font-size:20px;font-weight:700;text-transform:capitalize;">${month}</div>
                <button class="btn btn-outline" onclick="calNav(1)" style="font-size:18px;padding:8px 14px;">▶</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;">
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Seg</div>
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Ter</div>
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Qua</div>
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Qui</div>
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Sex</div>
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Sáb</div>
                <div style="font-size:12px;color:var(--text-light);font-weight:600;">Dom</div>
                ${days}
            </div>
            <button class="btn btn-outline" style="width:100%;margin-top:16px;" onclick="window._calDate=new Date();renderCalendario(document.getElementById('content-area'),{icon:'📅',name:'Calendário Escolar',desc:'Calendário com feriados e eventos'})">📅 Hoje</button>
        </div>
    `;
}
function calNav(dir) {
    window._calDate.setMonth(window._calDate.getMonth() + dir);
    renderCalendario(document.getElementById('content-area'), {icon:'📅',name:'Calendário Escolar',desc:'Calendário com feriados e eventos'});
}
