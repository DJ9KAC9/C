// Practice at Ora — partner chair booking prototype.
// Availability is deterministic per room+day so it behaves like a live calendar.
// Rules: Clinic 1 (Dr. Halasa's room) = Sat–Thu 19:00–24:00 + all day Friday (09:00–24:00).
//        Clinic 2 = daily 09:00–24:00, minus Ora's own simulated daytime bookings.

const ROOMS = {
  c1: { name:'Clinic 1', sub:'Flagship — evenings & Fridays',
        desc:'Dr. Halasa\u2019s operatory. 19:00\u201324:00 Sat\u2013Thu, all day Friday.',
        hours(d){ return d.getDay()===5 ? [9,24] : [19,24]; },
        rate(h,d){ return 25; } }, // premium room, premium hours
  c2: { name:'Clinic 2', sub:'Daily from 9:00',
        desc:'Second operatory, alongside our own schedule. 09:00\u201324:00 daily.',
        hours(d){ return [9,24]; },
        rate(h,d){ return (d.getDay()===5 || h>=19) ? 25 : 20; } }
};
const SHARE = 0.35, SHARE_MIN = 25, HOURLY_MIN_H = 2;
const CASES = ['Restorative','Endodontics','Prosthodontics','Extraction / surgery','Orthodontics','Pediatric','Cosmetic / veneers','Other'];

const state = { room:null, date:null, hours:[], model:null, caseType:null, caseFee:0, addons:{assist:false, scan:false} };
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const pad = n=>String(n).padStart(2,'0');
const fmtDate = d=>d.toLocaleDateString('en-GB',{weekday:'long', day:'numeric', month:'long'});
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

// A room-hour is taken if Ora's own operations (or another partner) hold it.
function isTaken(roomId, date, h){
  const key = roomId + date.toISOString().slice(0,10) + h;
  if(roomId==='c2' && date.getDay()!==5 && h>=9 && h<19) return hash(key)%100 < 55; // Ora's own daytime load
  return hash(key)%100 < 22; // evenings / Fridays lighter
}
function openHours(roomId, date){
  const [a,b] = ROOMS[roomId].hours(date);
  const out=[]; for(let h=a; h<b; h++) out.push({h, taken:isTaken(roomId,date,h)});
  return out;
}
function nextDates(n=28){const a=[];const d=new Date();d.setHours(0,0,0,0);for(let i=0;i<n;i++){const x=new Date(d);x.setDate(d.getDate()+i);a.push(x)}return a}

// ---------- render: rooms ----------
function renderRooms(){
  $('#roomOpts').innerHTML = Object.entries(ROOMS).map(([id,r])=>`
    <button class="opt" data-room="${id}" type="button"><b>${r.name}</b><span>${r.desc}</span></button>`).join('');
  $$('#roomOpts .opt').forEach(el=>el.onclick=()=>{
    state.room=el.dataset.room; state.date=null; state.hours=[];
    $$('#roomOpts .opt').forEach(x=>x.classList.toggle('on',x===el));
    renderCal(); renderHours(); update();
  });
}

// ---------- render: calendar ----------
const DOWS=['Su','Mo','Tu','We','Th','Fr','Sa'];
function renderCal(){
  $('#dows').innerHTML = DOWS.map(d=>`<div class="dow">${d}</div>`).join('');
  const dates = nextDates();
  const lead = dates[0].getDay();
  let cells = Array.from({length:lead},()=>'<div></div>');
  for(const d of dates){
    const has = state.room && openHours(state.room,d).some(s=>!s.taken);
    const on = state.date && d.getTime()===state.date.getTime();
    cells.push(`<button class="day-cell ${has?'avail':'off'} ${on?'on':''}" type="button" ${has?`data-d="${d.toISOString()}"`:'disabled'}>${d.getDate()}</button>`);
  }
  $('#grid').innerHTML = cells.join('');
  $$('#grid .avail').forEach(el=>el.onclick=()=>{
    state.date = new Date(el.dataset.d); state.hours=[];
    renderCal(); renderHours(); update();
  });
}

// ---------- render: hours ----------
function renderHours(){
  const box = $('#hours'), note = $('#hoursNote');
  if(!state.room || !state.date){ $('#dayLabel').textContent = state.room?'Choose a day':'Choose a room first'; box.innerHTML=''; note.textContent=''; return; }
  $('#dayLabel').textContent = fmtDate(state.date);
  const slots = openHours(state.room, state.date);
  box.innerHTML = slots.map(s=>{
    const on = state.hours.includes(s.h);
    return `<button class="slot ${s.taken?'taken':''} ${on?'on':''}" type="button" ${s.taken?'disabled':`data-h="${s.h}"`}>${pad(s.h)}:00–${pad(s.h+1)}:00</button>`;
  }).join('');
  note.textContent = state.room==='c1' && state.date.getDay()!==5
    ? 'Clinic 1 opens to partners at 19:00 on working days.'
    : 'Select consecutive hours. Two-hour minimum applies on the hourly model.';
  $$('#hours .slot[data-h]').forEach(el=>el.onclick=()=>{
    const h = +el.dataset.h;
    toggleHour(h, slots); renderHours(); update();
  });
}
function toggleHour(h, slots){
  const sel = state.hours;
  if(sel.includes(h)){
    // clicking an end trims the range; clicking inside restarts from that hour
    if(sel.length===1) state.hours=[];
    else if(h===Math.min(...sel) || h===Math.max(...sel)) state.hours = sel.filter(x=>x!==h);
    else state.hours=[h];
    return;
  }
  if(!sel.length){ state.hours=[h]; return; }
  const lo=Math.min(...sel,h), hi=Math.max(...sel,h);
  const range=[]; for(let x=lo;x<=hi;x++) range.push(x);
  const free = range.every(x=>slots.some(s=>s.h===x && !s.taken));
  state.hours = free ? range : [h];
}

// ---------- render: case + pricing ----------
function renderCase(){
  $('#caseTypes').innerHTML = CASES.map(c=>`<button class="pill" data-case="${c}" type="button">${c}</button>`).join('');
  $$('#caseTypes .pill').forEach(el=>el.onclick=()=>{
    state.caseType=el.dataset.case;
    $$('#caseTypes .pill').forEach(x=>x.classList.toggle('on',x===el)); update();
  });
  $('#payModels').innerHTML = `
    <button class="opt" data-model="share" type="button"><b>All-inclusive share</b><span>Ora takes 35% of case fees. Materials, machinery, sterilization, and reception included. Minimum 25 JOD.</span></button>
    <button class="opt" data-model="hourly" type="button"><b>Hourly chair</b><span>Bring your own materials, keep 100% of your fees. 20 JOD/h daytime, 25 JOD/h evenings &amp; Fridays. Two-hour minimum.</span></button>`;
  $$('#payModels .opt').forEach(el=>el.onclick=()=>{
    state.model=el.dataset.model;
    $$('#payModels .opt').forEach(x=>x.classList.toggle('on',x===el));
    $('#shareFields').classList.toggle('show', state.model==='share');
    $('#hourFields').classList.toggle('show', state.model==='hourly'); update();
  });
  $('#caseFee').addEventListener('input', e=>{ state.caseFee = parseFloat(e.target.value)||0; update(); });
  $$('#hourFields .pill').forEach(el=>el.onclick=()=>{
    const k=el.dataset.addon; state.addons[k]=!state.addons[k];
    el.classList.toggle('on',state.addons[k]); update();
  });
}

// ---------- estimate ----------
function estimate(){
  if(!state.room || !state.hours.length || !state.model) return null;
  const r = ROOMS[state.room], d = state.date;
  const rows=[], hrs = state.hours.length;
  rows.push(['Room', r.name]);
  rows.push(['When', `${fmtDate(d)}, ${pad(Math.min(...state.hours))}:00–${pad(Math.max(...state.hours)+1)}:00 (${hrs} h)`]);
  if(state.caseType) rows.push(['Case', state.caseType]);
  let total=0, note='';
  if(state.model==='share'){
    rows.push(['Model','All-inclusive · 35% to Ora']);
    if(state.caseFee>0){
      const cut = Math.max(state.caseFee*SHARE, SHARE_MIN);
      rows.push(['Expected case fees', state.caseFee.toFixed(0)+' JOD']);
      rows.push(['Ora share (35%)', cut.toFixed(0)+' JOD']);
      rows.push(['You keep', (state.caseFee-cut).toFixed(0)+' JOD']);
      total = cut; note = 'Settled the same evening from the patient payment. Includes materials from our stock.';
    } else { total = SHARE_MIN; note='Enter expected case fees to see your split. 25 JOD minimum applies.'; }
  } else {
    const billed = Math.max(hrs, HOURLY_MIN_H);
    const rate = r.rate(Math.min(...state.hours), d);
    rows.push(['Model','Hourly · own materials']);
    rows.push(['Chair', `${billed} h × ${rate} JOD`]);
    total = billed*rate;
    if(billed>hrs) note='Billed at the two-hour minimum. ';
    if(state.addons.assist){ rows.push(['Assistant', `${billed} h × 8 JOD`]); total+=billed*8; }
    if(state.addons.scan){ rows.push(['Intraoral scan','15 JOD']); total+=15; }
    note += 'Paid at check-in. X-rays billed as taken, 3 JOD each.';
  }
  return {rows, total, note};
}

function update(){
  const e = estimate();
  $('#estRows').innerHTML = e ? e.rows.map(([k,v])=>`<div class="row"><span>${k}</span><span>${v}</span></div>`).join('') : '';
  $('#estTotal').textContent = e ? (state.model==='share' ? e.total.toFixed(0)+' JOD to Ora' : e.total.toFixed(0)+' JOD') : '—';
  $('#estNote').textContent = e ? e.note : 'Pick a room and hours to see your estimate.';
  $('#submit').disabled = !(e && state.caseType && $('#dName').value.trim() && $('#dLic').value.trim() && $('#dPhone').value.trim() && $('#agree').checked && (state.model!=='share' || state.caseFee>0));
}

// ---------- submit ----------
function wireSubmit(){
  ['dName','dLic','dPhone','dSpec'].forEach(id=>$('#'+id).addEventListener('input',update));
  $('#agree').addEventListener('change',update);
  $('#submit').onclick = ()=>{
    const e = estimate(); if(!e) return;
    document.querySelector('.pro-flow').hidden = true;
    const done = $('#proDone'); done.hidden = false;
    $('#doneText').textContent = `${ROOMS[state.room].name}, ${fmtDate(state.date)}, ${pad(Math.min(...state.hours))}:00–${pad(Math.max(...state.hours)+1)}:00 — requested for ${$('#dName').value.trim()}. We'll confirm on WhatsApp (${$('#dPhone').value.trim()}) within two hours. First time at Ora? Bring your JDA card to check-in.`;
    done.scrollIntoView({behavior:'smooth', block:'center'});
  };
}

renderRooms(); renderCal(); renderHours(); renderCase(); wireSubmit(); update();
