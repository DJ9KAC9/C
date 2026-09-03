// Ora booking flow — client-side prototype. Availability is generated deterministically
// per doctor so the calendar behaves like a live one (no double bookings, respects schedules).

const CATS = {
  dental:{ title:'Dental', concerns:['Tooth pain','Emergency','General check-up','Teeth cleaning','Whitening','Braces / orthodontics','Dental implants','Veneers','Cosmetic dentistry','Gum issues','Root canal',"Children's dentistry",'Something else'] },
  skin:{ title:'Skin Lounge', concerns:['Skin consultation','Facial treatment','Acne concerns','Anti-aging','Skin rejuvenation','Laser treatment','Something else'] },
  online:{ title:'Online consultation', concerns:['Dental consultation','Follow-up consultation','Skin consultation','General advisory'] }
};

const DOCS = [
  {id:'awen', name:'Dr. Awen Halasa', init:'AH', spec:'Cosmetic dentistry & facial aesthetics', years:10, langs:'Arabic, English', intro:'DDS (UoJ), MFD RCSI & RCSE, PGDip Aesthetic Dentistry (Leeds). Plans smiles with digital scans so you see the result first.', days:[0,1,2,3,4], hours:[9,18], match:['Whitening','Veneers','Cosmetic dentistry','Dental implants','General check-up','Dental consultation','Follow-up consultation']},
  {id:'masri', name:'Dr. Omar Masri', init:'OM', spec:'Endodontics & emergency care', years:11, langs:'Arabic, English', intro:'Handles pain first, explanation second, judgement never.', days:[0,1,2,3,4,6], hours:[10,20], match:['Tooth pain','Emergency','Root canal','Gum issues','Teeth cleaning','General check-up','Dental consultation','General advisory','Something else']},
  {id:'saleh', name:'Dr. Rania Saleh', init:'RS', spec:"Orthodontics & children's dentistry", years:9, langs:'Arabic, English, German', intro:'Patient with nervous children and adults who still feel like one at the dentist.', days:[0,2,4,6], hours:[9,17], match:['Braces / orthodontics',"Children's dentistry",'General check-up','Teeth cleaning','Dental consultation','Follow-up consultation']},
  {id:'khalil', name:'Dr. Nour Khalil', init:'NK', spec:'Dermatology, The Skin Lounge', years:12, langs:'Arabic, English', intro:'Treats skin as a long conversation, not a single appointment.', days:[1,2,3,4,6], hours:[11,19], match:['Skin consultation','Facial treatment','Acne concerns','Anti-aging','Skin rejuvenation','Laser treatment','Something else','General advisory']}
];

const DURATION = {'Emergency':30,'Tooth pain':30,'General check-up':30,'Teeth cleaning':45,'Whitening':60,'Braces / orthodontics':45,'Dental implants':60,'Veneers':60,'Cosmetic dentistry':45,'Gum issues':30,'Root canal':75,"Children's dentistry":30,'Skin consultation':30,'Facial treatment':60,'Acne concerns':30,'Anti-aging':45,'Skin rejuvenation':60,'Laser treatment':45,'Something else':30};
const FEES = {'Emergency':40,'Tooth pain':30,'General check-up':25,'Teeth cleaning':45,'Whitening':180,'Braces / orthodontics':40,'Dental implants':60,'Veneers':60,'Cosmetic dentistry':40,'Gum issues':35,'Root canal':120,"Children's dentistry":25,'Skin consultation':35,'Facial treatment':90,'Acne concerns':35,'Anti-aging':60,'Skin rejuvenation':110,'Laser treatment':95,'Something else':30};
const ONLINE_FEES = {15:20, 30:35};

const state = { cat:null, concern:null, severity:null, onset:null, note:'', files:0, doc:null, date:null, time:null, duration:30, fee:0, fast:false, online:false, onlineLen:15 };
const params = new URLSearchParams(location.search);

// ---------- helpers ----------
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const fmtDate=d=>d.toLocaleDateString((document.documentElement.lang==='ar'?'ar-JO':'en-GB'),{weekday:'long',day:'numeric',month:'long'});
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
// JS getDay: 0=Sun. Our schedule uses 0=Sun..6=Sat (Jordan week Sat–Thu, Friday closed).
function slotsFor(doc, date, step){
  const key=date.toISOString().slice(0,10);
  if(!doc.days.includes(date.getDay())) return [];
  const out=[];
  for(let h=doc.hours[0]; h<doc.hours[1]; h++) for(let m=0;m<60;m+=step){
    const t=`${pad(h)}:${pad(m)}`;
    const taken = hash(doc.id+key+t)%100 < 42; // ~42% booked
    out.push({t,taken});
  }
  return out;
}
function nextDates(n=28){const a=[];const d=new Date();d.setHours(0,0,0,0);for(let i=0;i<n;i++){const x=new Date(d);x.setDate(d.getDate()+i);a.push(x)}return a}

// ---------- steps ----------
const STEPS = ['cat','describe','doc','time','confirm'];
let cur = 0;
function show(i){
  cur=i;
  $$('.step-pane').forEach((p,k)=>p.classList.toggle('active',k===i));
  $('.progress i').style.width = ((i+1)/STEPS.length*100)+'%';
  $('#back').style.visibility = i===0?'hidden':'visible';
  $('.emg').style.display = i===0?'':'none';
  $('#next').textContent = i===STEPS.length-1 ? (state.online?'Pay and confirm':'Pay and confirm') : 'Continue';
  $('#next').disabled = !canContinue();
  window.scrollTo({top:0,behavior:'smooth'});
  if(i===2) renderDocs(); if(i===3) renderCalendar(); if(i===4) renderSummary();
}
function canContinue(){
  switch(STEPS[cur]){
    case 'cat': return !!state.concern;
    case 'describe': return true;
    case 'doc': return !!state.doc;
    case 'time': return !!(state.date&&state.time);
    case 'confirm': return true;
  }
}
function refresh(){ $('#next').disabled=!canContinue(); }

// step 1
function renderCats(){
  const box=$('#cats');
  box.innerHTML='';
  for(const [k,c] of Object.entries(CATS)){
    const b=document.createElement('button');b.className='opt'+(state.cat===k?' on':'');
    b.innerHTML=`<b>${c.title}</b><span>${k==='dental'?'Pain, check-ups, cosmetic, children':k==='skin'?'Consultation, facials, laser, rejuvenation':'Video with a specialist, 15 or 30 min'}</span>`;
    b.onclick=()=>{state.cat=k;state.online=(k==='online');state.concern=null;renderCats();renderConcerns();refresh()};
    box.appendChild(b);
  }
  renderConcerns();
}
function renderConcerns(){
  const box=$('#concerns');box.innerHTML='';
  if(!state.cat) return;
  CATS[state.cat].concerns.forEach(c=>{
    const b=document.createElement('button');b.className='pill'+(state.concern===c?' on':'');b.textContent=c;
    b.onclick=()=>{state.concern=c;renderConcerns();refresh()};box.appendChild(b);
  });
}
// step 2
function segs(id,key,vals){
  const box=$(id);box.innerHTML='';
  vals.forEach(v=>{const b=document.createElement('button');b.className='pill'+(state[key]===v?' on':'');b.textContent=v;b.onclick=()=>{state[key]=v;segs(id,key,vals)};box.appendChild(b)});
}
// step 3
function renderDocs(){
  const box=$('#docs');box.innerHTML='';
  const pool = state.cat==='skin' ? DOCS.filter(d=>d.id==='khalil') : state.cat==='online' ? DOCS : DOCS.filter(d=>d.id!=='khalil');
  const ranked = pool.map(d=>({d,rec:d.match.includes(state.concern)})).sort((a,b)=>b.rec-a.rec);
  if(!state.doc && ranked[0]) state.doc=ranked[0].d.id;
  ranked.forEach(({d,rec})=>{
    const b=document.createElement('button');b.className='doc'+(state.doc===d.id?' on':'');
    b.innerHTML=`<div class="portrait"><span>${d.init}</span></div><div><b>${d.name}</b><div class="meta">${d.spec}<br>${d.years} years · ${d.langs}<br>${d.intro}</div>${rec?'<span class="rec">Recommended for '+state.concern+'</span>':''}</div>`;
    b.onclick=()=>{state.doc=d.id;state.date=null;state.time=null;renderDocs();refresh()};
    box.appendChild(b);
  });
  refresh();
}
// step 4 — calendar
let viewOffset=0;
function renderCalendar(){
  const doc=DOCS.find(d=>d.id===state.doc);
  const step = state.online ? 15 : 30;
  state.duration = state.online ? state.onlineLen : (DURATION[state.concern]||30);
  const dates=nextDates(28);
  const grid=$('#days');grid.innerHTML='';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{const s=document.createElement('div');s.className='dow';s.textContent=d;grid.appendChild(s)});
  // pad to weekday of first date
  for(let i=0;i<dates[0].getDay();i++){grid.appendChild(document.createElement('div'))}
  $('#calTitle').textContent = dates[0].toLocaleDateString((document.documentElement.lang==='ar'?'ar-JO':'en-GB'),{month:'long',year:'numeric'}) + (dates[27].getMonth()!==dates[0].getMonth()?' – '+dates[27].toLocaleDateString((document.documentElement.lang==='ar'?'ar-JO':'en-GB'),{month:'long'}):'');
  dates.forEach(d=>{
    const free = slotsFor(doc,d,step).some(s=>!s.taken);
    const c=document.createElement('div');c.className='day-cell '+(free?'avail':'off');c.textContent=d.getDate();
    const key=d.toDateString();
    if(state.date===key) c.classList.add('on');
    if(free) c.onclick=()=>{state.date=key;state.time=null;renderCalendar()};
    grid.appendChild(c);
  });
  const times=$('#slots');times.innerHTML='';
  if(!state.date){ $('#timesTitle').textContent='Pick a day first'; $('#timesSub').textContent='Days with a dot have open times with '+doc.name+'.'; refresh(); return; }
  const d=new Date(state.date);
  $('#timesTitle').textContent=fmtDate(d);
  $('#timesSub').textContent=`${doc.name} · ${state.duration} minutes`;
  slotsFor(doc,d,step).forEach(s=>{
    const b=document.createElement('button');b.className='slot'+(s.taken?' taken':'')+(state.time===s.t?' on':'');b.textContent=s.t;b.disabled=s.taken;
    if(!s.taken) b.onclick=()=>{state.time=s.t;renderCalendar()};
    times.appendChild(b);
  });
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('#tz').textContent = state.online ? `Times shown in your time zone (${tz}). The clinic is in Asia/Amman.` : 'Times are clinic local time (Asia/Amman).';
  refresh();
}
// step 5
function renderSummary(){
  const doc=DOCS.find(d=>d.id===state.doc);
  state.fee = state.online ? ONLINE_FEES[state.onlineLen] : (FEES[state.concern]||30);
  const d=new Date(state.date);
  $('#sum').innerHTML = `
    <div class="row"><span>Service</span><span>${state.online?'Online · '+state.concern:CATS[state.cat].title+' · '+state.concern}</span></div>
    <div class="row"><span>Specialist</span><span>${doc.name}</span></div>
    <div class="row"><span>Date</span><span>${fmtDate(d)}</span></div>
    <div class="row"><span>Time</span><span>${state.time}</span></div>
    <div class="row"><span>Duration</span><span>${state.duration} minutes</span></div>
    ${state.note?`<div class="row"><span>Your note</span><span style="max-width:28ch;text-align:right">${state.note.slice(0,120)}${state.note.length>120?'…':''}</span></div>`:''}
    <div class="total"><span>${state.online?'Consultation fee':'Visit fee'}</span><span>${state.fee} JOD</span></div>
    <div class="pay-note">${state.online?'Charged now. Your secure video link is sent on confirmation.':'Charged now and deducted from any treatment. Free cancellation up to 12 hours before.'}</div>`;
}
function confirmBooking(){
  const doc=DOCS.find(d=>d.id===state.doc);
  const name=$('#pname').value.trim(), email=$('#pemail').value.trim(), phone=$('#pphone').value.trim();
  if(!name||!(email||phone)){ toast('Add your name and one way to reach you.'); return; }
  const ref='ORA-'+hash(name+state.date+state.time).toString(36).toUpperCase().slice(0,6);
  $('.flow-body').innerHTML = `
    <div class="confirm">
      <div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F3EFE8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></div>
      <h1>You're booked, ${name.split(' ')[0]}.</h1>
      <p class="lede" style="margin-top:20px">${doc.name} will see you on ${fmtDate(new Date(state.date))} at ${state.time}${state.online?' by video':' at Ora, Abdoun'}. We've sent the details to ${email||phone}, and a reminder will arrive the day before.</p>
      <div class="sheet" style="margin-top:28px">
        <div class="row"><span>Reference</span><span>${ref}</span></div>
        <div class="row"><span>${state.online?'Video link':'Address'}</span><span>${state.online?'Sent 15 minutes before your time':'Ora Clinic, Abdoun, Amman'}</span></div>
        <div class="row"><span>Paid</span><span>${state.fee} JOD (simulated in this preview)</span></div>
      </div>
      <div class="actions-row">
        <a class="btn btn-primary" href="index.html">Back to Ora</a>
        <button class="btn btn-ghost" onclick="toast('Calendar file would download here')">Add to calendar</button>
        <button class="btn btn-ghost" onclick="toast('Rescheduling opens the same calendar with your slot released')">Reschedule</button>
      </div>
    </div>`;
  $('.flow-foot').style.display='none';
  $('.progress i').style.width='100%';
  window.scrollTo({top:0,behavior:'smooth'});
}

// ---------- fast track ----------
function fastTrack(){
  state.fast=true; state.cat='dental'; state.concern='Emergency'; state.online=false; state.severity='Severe';
  const doc=DOCS.find(d=>d.id==='masri');
  const today=new Date(); const now=today.getHours()*60+today.getMinutes();
  let found=null;
  for(const d of nextDates(3)){
    const slots=slotsFor(doc,d,30).filter(s=>!s.taken);
    const isToday=d.toDateString()===today.toDateString();
    const s=slots.find(s=>{const [h,m]=s.t.split(':').map(Number);return !isToday||h*60+m>now+45});
    if(s){found={d,s};break}
  }
  $$('.step-pane').forEach(p=>p.classList.remove('active'));
  $('#fast').classList.add('active'); $('.emg').style.display='none';
  $('.progress i').style.width='80%';
  $('.flow-foot').style.display='none';
  if(found){
    state.doc=doc.id;state.date=found.d.toDateString();state.time=found.s.t;
    const isToday=found.d.toDateString()===today.toDateString();
    $('#fastWhen').textContent=(isToday?'Today ':found.d.toLocaleDateString((document.documentElement.lang==='ar'?'ar-JO':'en-GB'),{weekday:'long'})+' ')+found.s.t;
    $('#fastWho').textContent=`${doc.name}, emergency care · 30 minutes · 40 JOD`;
  } else {
    $('#fastWhen').textContent='Call us now';
  }
}

// ---------- init ----------
document.addEventListener('DOMContentLoaded',()=>{
  renderCats();
  segs('#sev','severity',['Mild','Moderate','Severe']);
  segs('#onset','onset',['Today','A few days ago','More than a week ago','Ongoing']);
  $('#note').addEventListener('input',e=>state.note=e.target.value);
  $('#files').addEventListener('change',e=>{state.files=e.target.files.length;$('#upl').textContent=state.files?`${state.files} image${state.files>1?'s':''} attached`:'Add a photo if it helps (optional)'});
  $$('#olen .pill').forEach(b=>b.onclick=()=>{$$('#olen .pill').forEach(x=>x.classList.remove('on'));b.classList.add('on');state.onlineLen=+b.dataset.len});
  $('#next').onclick=()=>{ if(cur===STEPS.length-1) confirmBooking(); else show(cur+1); };
  $('#back').onclick=()=>show(Math.max(0,cur-1));
  $('#fastBtn').onclick=fastTrack;
  $('#fastGo').onclick=()=>{ state.fast=false; show(4); $('.flow-foot').style.display=''; };
  $('#fastBrowse').onclick=()=>{ $('.flow-foot').style.display=''; show(2); };

  // deep links
  const cat=params.get('cat'); if(cat&&CATS[cat]){state.cat=cat;state.online=cat==='online';renderCats()}
  const concern=params.get('concern');
  if(concern==='cosmetic'){state.concern='Cosmetic dentistry';renderConcerns()}
  else if(concern&&state.cat&&CATS[state.cat].concerns.includes(concern)){state.concern=concern;renderConcerns()}
  const len=params.get('len'); if(len&&ONLINE_FEES[len]){state.onlineLen=+len;$$('#olen .pill').forEach(x=>x.classList.toggle('on',x.dataset.len===len))}
  const doc=params.get('doc'); if(doc&&DOCS.some(d=>d.id===doc)) state.doc=doc;
  show(0);
  if(params.get('fast')==='1') fastTrack();
  // show/hide online-length control
  new MutationObserver(()=>{ $('#olenWrap').style.display = state.online?'':'none'; }).observe($('#cats'),{subtree:true,attributes:true,childList:true});
  $('#olenWrap').style.display = state.online?'':'none';
});
