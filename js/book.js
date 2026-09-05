// Ora booking flow — client-side prototype. Availability is generated deterministically
// per doctor so the calendar behaves like a live one (no double bookings, respects schedules).

const CATS = {
  dental:{ title:'Dental', concerns:['Tooth pain','Emergency','General check-up','Teeth cleaning','Whitening','Braces / orthodontics','Dental implants','Veneers','Crowns & bridges','Full-mouth rehabilitation','Cosmetic dentistry','Gum issues','Root canal',"Children's dentistry",'Something else'] },
  skin:{ title:'Skin Lounge', concerns:['Skin consultation','HydroFacial','Facial treatment','Botox','Dermal fillers','Profhilo','Mesotherapy','GanaFill bio-stimulator','Amber injection','Adipozone','Hydro Max','Skin booster','Acne concerns','Anti-aging','Skin rejuvenation','Laser treatment','Something else'] },
  online:{ title:'Online consultation', concerns:['Dental consultation','Follow-up consultation','Skin consultation','General advisory'] }
};

const DOCS = [
  {id:'awen', name:'Dr. Awen Halasa', init:'AH', spec:'Cosmetic dentistry & facial aesthetics', years:0, langs:'Arabic, English', intro:'DDS (UoJ), MFD RCSI & RCSE, PGDip Aesthetic Dentistry (Leeds). Plans smiles with digital scans so you see the result first.', days:[0,1,2,3,4], hours:[9,18], match:['Whitening','Veneers','Cosmetic dentistry','Dental implants','Crowns & bridges','Full-mouth rehabilitation','Root canal','Tooth pain','Emergency','Gum issues','Teeth cleaning','General check-up','Dental consultation','Follow-up consultation','Botox','Dermal fillers','Profhilo','Mesotherapy','GanaFill bio-stimulator','Amber injection','Adipozone','Hydro Max','Skin booster','HydroFacial','Skin consultation','Facial treatment','Skin rejuvenation','Anti-aging','General advisory','Something else']},
  {id:'rana', name:'Dr. Rana Odeh', init:'RO', spec:'Orthodontics', years:0, langs:'Arabic, English', intro:'DDS · MFD RCSI · MSc Orthodontics (University of Jordan). Braces and aligners, planned on digital scans.', days:[0,1,2,3,4,6], hours:[9,18], match:['Braces / orthodontics',"Children's dentistry",'General check-up','Teeth cleaning','Dental consultation','Follow-up consultation']}
];

const DURATION = {'Emergency':30,'Tooth pain':30,'General check-up':30,'Teeth cleaning':45,'Whitening':60,'Braces / orthodontics':45,'Dental implants':60,'Veneers':60,'Cosmetic dentistry':45,'Gum issues':30,'Root canal':75,"Children's dentistry":30,'Skin consultation':30,'Facial treatment':60,'Acne concerns':30,'Anti-aging':45,'Skin rejuvenation':60,'Laser treatment':45,'Something else':30,'Crowns & bridges':60,'Full-mouth rehabilitation':60,'HydroFacial':60,'Botox':30,'Dermal fillers':45,'Profhilo':30,'Mesotherapy':45,'GanaFill bio-stimulator':45,'Amber injection':30,'Adipozone':30,'Hydro Max':45,'Skin booster':30};
const FEES = {'Emergency':30,'Tooth pain':30,'General check-up':30,'Teeth cleaning':40,'Whitening':150,'Braces / orthodontics':40,'Dental implants':60,'Veneers':160,'Cosmetic dentistry':40,'Gum issues':35,'Root canal':80,"Children's dentistry":25,'Skin consultation':20,'Facial treatment':90,'Acne concerns':35,'Anti-aging':120,'Skin rejuvenation':110,'Laser treatment':95,'Something else':30,'Crowns & bridges':160,'Full-mouth rehabilitation':60,'HydroFacial':40,'Botox':150,'Dermal fillers':150,'Profhilo':160,'Mesotherapy':120,'GanaFill bio-stimulator':400,'Amber injection':120,'Adipozone':100,'Hydro Max':100,'Skin booster':100};
const ONLINE_FEES = {15:16, 30:28}; // 20% below in-clinic
const ON_EXAM = new Set(['Braces / orthodontics','Full-mouth rehabilitation','Facial treatment','Laser treatment','Dental implants']);
const EXAM_NOTE = {'Braces / orthodontics':'braces quoted 800–1500 JOD at examination'};

const state = { cat:null, concern:null, concerns:[], severity:null, onset:null, note:'', files:0, doc:null, date:null, time:null, duration:30, fee:0, fast:false, online:false, onlineLen:15 };
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
  $('#next').textContent = i===STEPS.length-1 ? (state.fee>0?"I've paid — confirm booking":'Confirm booking') : 'Continue';
  $('#next').disabled = !canContinue();
  window.scrollTo({top:0,behavior:'smooth'});
  if(i===2) renderDocs(); if(i===3) renderCalendar(); if(i===4){ renderSummary(); wireCliq(); refresh(); }
}
function canContinue(){
  switch(STEPS[cur]){
    case 'cat': return state.online ? !!state.concern : state.concerns.length>0;
    case 'describe': return true;
    case 'doc': return !!state.doc;
    case 'time': return !!(state.date&&state.time);
    case 'confirm': return state.fee>0 ? !!state.payProof : true;
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
    b.onclick=()=>{state.cat=k;state.online=(k==='online');if(state.online){state.concerns=[];state.concern=null}renderCats();renderConcerns();refresh()};
    box.appendChild(b);
  }
  renderConcerns();
}
function selectionLine(){
  const el=$('#pickCount'); if(!el) return;
  if(state.online||!state.concerns.length){ el.textContent=''; return; }
  const mins=state.concerns.reduce((t,c)=>t+(DURATION[c]||30),0);
  const fee=state.concerns.reduce((t,c)=>t+(FEES[c]||30),0);
  const priced=state.concerns.filter(c=>!ON_EXAM.has(c)), exam=state.concerns.filter(c=>ON_EXAM.has(c));
  const feeSum=priced.reduce((t,c)=>t+(FEES[c]||30),0);
  let line=state.concerns.join(' + ')+' · ~'+mins+' min';
  if(feeSum>0) line+=' · '+feeSum+' JOD';
  if(exam.length) line+=' · '+exam.map(c=>EXAM_NOTE[c]||c+' quoted at examination').join(' · ');
  el.textContent=line;
}
function renderConcerns(){
  const box=$('#concerns');box.innerHTML='';
  if(!state.cat) return;
  CATS[state.cat].concerns.forEach(c=>{
    const on = state.online ? state.concern===c : state.concerns.includes(c);
    const b=document.createElement('button');b.className='pill'+(on?' on':'');b.textContent=c;
    b.onclick=()=>{
      if(state.online){ state.concern=c; }
      else {
        const i=state.concerns.indexOf(c);
        if(i>-1) state.concerns.splice(i,1); else state.concerns.push(c);
        state.concern=state.concerns[0]||null;
      }
      renderConcerns();refresh()
    };box.appendChild(b);
  });
  selectionLine();
}
// step 2
function segs(id,key,vals){
  const box=$(id);box.innerHTML='';
  vals.forEach(v=>{const b=document.createElement('button');b.className='pill'+(state[key]===v?' on':'');b.textContent=v;b.onclick=()=>{state[key]=v;segs(id,key,vals)};box.appendChild(b)});
}
// step 3
function renderDocs(){
  const box=$('#docs');box.innerHTML='';
  const wants = state.online ? [state.concern] : state.concerns;
  const ranked = DOCS.map(d=>{
    const cover = wants.filter(c=>d.match.includes(c)).length;
    return {d, cover, rec: cover===wants.length && wants.length>0};
  }).sort((a,b)=>b.cover-a.cover);
  if(!state.doc && ranked[0]) state.doc=ranked[0].d.id;
  ranked.forEach(({d,rec})=>{
    const b=document.createElement('button');b.className='doc'+(state.doc===d.id?' on':'');
    b.innerHTML=`<div class="portrait"><span>${d.init}</span></div><div><b>${d.name}</b><div class="meta">${d.spec}<br>${d.years?d.years+" years · ":""}${d.langs}<br>${d.intro}</div>${rec?'<span class="rec">Covers everything you picked</span>':''}</div>`;
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
  state.duration = state.online ? state.onlineLen : Math.min(state.concerns.reduce((t,c)=>t+(DURATION[c]||30),0)||30, 180);
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
function wireCliq(){
  const amt=$('#cliqAmt'), box=$('#cliqBox'), note=$('#examPayNote');
  if(amt) amt.textContent = state.fee>0 ? state.fee+' JOD' : '';
  if(box) box.style.display = state.fee>0 ? '' : 'none';
  if(note) note.hidden = !(state.concerns||[]).some(c=>ON_EXAM.has(c));
  const inp=$('#payShot');
  if(inp && !inp.__wired){ inp.__wired=true; inp.onchange=()=>{
    const f=inp.files && inp.files[0]; if(!f) return;
    state.payProof=true; $('#payShotLbl').textContent='Screenshot attached ✓';
    const r=new FileReader(); r.onload=e=>{ const im=$('#payPrev'); im.src=e.target.result; im.hidden=false; }; r.readAsDataURL(f);
    refresh();
  };}
}
function renderSummary(){
  const doc=DOCS.find(d=>d.id===state.doc);
  state.fee = state.online ? ONLINE_FEES[state.onlineLen] : (state.concerns.reduce((t,c)=>t+(ON_EXAM.has(c)?0:(FEES[c]||30)),0));
  const d=new Date(state.date);
  $('#sum').innerHTML = `
    <div class="row"><span>Service</span><span>${state.online?'Online · '+state.concern:(state.concerns.join(' + ')||state.concern)}</span></div>
    <div class="row"><span>Specialist</span><span>${doc.name}</span></div>
    <div class="row"><span>Date</span><span>${fmtDate(d)}</span></div>
    <div class="row"><span>Time</span><span>${state.time}</span></div>
    <div class="row"><span>Duration</span><span>${state.duration} minutes</span></div>
    ${state.note?`<div class="row"><span>Your note</span><span style="max-width:28ch;text-align:right">${state.note.slice(0,120)}${state.note.length>120?'…':''}</span></div>`:''}
    <div class="total"><span>${state.online?'Consultation fee':'Visit fee'}</span><span>${state.fee>0?state.fee+' JOD':'Quoted at the clinic'}</span></div>
    <div class="pay-note">${state.online?'Charged now. Your secure video link is sent on confirmation.':'Charged now and deducted from any treatment. Free cancellation up to 12 hours before.'}</div>`;
}
function pushToPortal(booking){try{const k='ora-admin-v2';const db=JSON.parse(localStorage.getItem(k))||{appts:[],reqs:[],blocks:[],txns:[]};db.appts.push(booking);db.txns=db.txns||[];db.txns.push({id:'t'+Date.now(),date:booking.date,who:booking.who,what:booking.what+(booking.pay==='cliq'?' · CliQ proof attached':''),amount:booking.fee||0,kind:'patient',status:booking.fee>0?'pending':'paid'});localStorage.setItem(k,JSON.stringify(db));}catch(e){}}
function confirmBooking(){
  const doc=DOCS.find(d=>d.id===state.doc);
  const name=$('#pname').value.trim(), email=$('#pemail').value.trim(), phone=$('#pphone').value.trim();
  if(!name||!(email||phone)){ toast('Add your name and one way to reach you.'); return; }
  const ref='ORA-'+hash(name+state.date+state.time).toString(36).toUpperCase().slice(0,6);
  pushToPortal({id:'w'+ref, room:'c1', date:new Date(state.date).toISOString().slice(0,10), h:parseInt(state.time), who:name, what:(state.online?'Online · '+(state.concern||'Consultation'):(state.concerns.join(' + ')||'Consultation')), kind:'patient', status:'booked', fee:state.fee, pay:'cliq'});
  $('.flow-body').innerHTML = `
    <div class="confirm">
      <div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F3EFE8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></div>
      <h1>You're booked, ${name.split(' ')[0]}.</h1>
      <p class="lede" style="margin-top:20px">${doc.name} will see you on ${fmtDate(new Date(state.date))} at ${state.time}${state.online?' by video':' at Ora, Madaba'}. We've sent the details to ${email||phone}, and a reminder will arrive the day before.</p>
      <div class="sheet" style="margin-top:28px">
        <div class="row"><span>Reference</span><span>${ref}</span></div>
        <div class="row"><span>${state.online?'Video link':'Address'}</span><span>${state.online?'Sent 15 minutes before your time':'Ora Clinic, Al-Gharbi St. 181, Madaba'}</span></div>
        <div class="row"><span>Payment</span><span>${state.fee>0 ? state.fee+' JOD · CliQ to Own99, Etihad Bank — being verified' : 'At the clinic, after examination'}</span></div>
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
  state.fast=true; state.cat='dental'; state.concern='Emergency'; state.concerns=['Emergency']; state.online=false; state.severity='Severe';
  const doc=DOCS.find(d=>d.id==='awen');
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
  const pc=params.get('concern'); if(pc){ if(state.online) state.concern=pc; else { state.concerns=[pc]; state.concern=pc; } renderConcerns(); }
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
