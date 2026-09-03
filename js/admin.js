// Ora clinic portal — client-side prototype. State persists in this browser's
// localStorage; the Supabase build replaces it with a real database and roles.
const STAFF = ['awe.halasa71@gmail.com', 'hello@ora.clinic'];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.toISOString().slice(0,10);
const fmt=d=>d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

// ---------- store ----------
const DB_KEY='ora-admin-v1';
function load(){ try{return JSON.parse(localStorage.getItem(DB_KEY))||null}catch(e){return null} }
function save(db){ try{localStorage.setItem(DB_KEY, JSON.stringify(db))}catch(e){} }

function seed(){
  const names=['Faris N.','Dana K.','Yara S.','Omar T.','Lina M.','Hala R.','Sami D.','Noor A.','Rami H.','Maya B.'];
  const cases=['Check-up','Cleaning','Root canal','Whitening','Veneer fit','Filling','Emergency','Kids — first visit','Implant review','Gum treatment'];
  const db={appts:[], reqs:[], blocks:[]};
  const today=new Date(); today.setHours(0,0,0,0);
  for(let i=0;i<14;i++){
    const d=new Date(today); d.setDate(today.getDate()+i); const k=dkey(d);
    if(d.getDay()===5) continue; // Friday: no patient list, partner day
    for(let h=9;h<19;h++){
      const r=hash('c1'+k+h)%100;
      if(r<45) db.appts.push({id:'a'+k+h+'1', room:'c1', date:k, h, who:names[r%10], what:cases[r%10], kind:'patient', status:'booked'});
      const r2=hash('c2'+k+h)%100;
      if(r2<30) db.appts.push({id:'a'+k+h+'2', room:'c2', date:k, h, who:names[(r2+3)%10], what:cases[(r2+5)%10], kind:'patient', status:'booked'});
    }
  }
  // pending partner requests
  const rq=(days,room,h1,h2,doc,caseT,model)=>{const d=new Date(today);d.setDate(today.getDate()+days);
    return {id:'r'+days+room+h1, room, date:dkey(d), h1, h2, doc, caseT, model, status:'pending'}};
  db.reqs.push(rq(1,'c1',19,22,'Dr. Sara Qudah','Restorative','Hourly · 3h × 25 JOD'));
  db.reqs.push(rq(2,'c2',20,22,'Dr. Khaled Nims','Endodontics','Share · 35% of ~300 JOD'));
  db.reqs.push(rq(3,'c1',9,13,'Dr. Rula Haddadin','Cosmetic / veneers','Hourly · 4h × 25 JOD (Friday)'));
  return db;
}
let db = load() || seed(); save(db);

// ---------- gate ----------
function signedIn(){ try{return localStorage.getItem('ora-admin-user')}catch(e){return null} }
function gate(){
  const u=signedIn();
  if(u){ $('#gate').hidden=true; $('#portal').hidden=false; $('#whoami').textContent=u; render(); }
  else { $('#gate').hidden=false; $('#portal').hidden=true; }
}
$('#gGo').onclick=()=>{
  const e=($('#gEmail').value||'').trim().toLowerCase();
  if(STAFF.includes(e)){ localStorage.setItem('ora-admin-user',e); $('#gErr').hidden=true; gate(); }
  else $('#gErr').hidden=false;
};
$('#gEmail').addEventListener('keydown',ev=>{ if(ev.key==='Enter') $('#gGo').click(); });
$('#signOut').onclick=()=>{ localStorage.removeItem('ora-admin-user'); gate(); };

// ---------- tabs ----------
$$('.tab-link').forEach(b=>b.onclick=()=>{
  $$('.tab-link').forEach(x=>x.classList.toggle('on',x===b));
  $$('.a-tab').forEach(t=>t.hidden = t.id!=='t-'+b.dataset.tab);
});

// ---------- today ----------
function apptRow(a){
  const t=`${pad(a.h)}:00`;
  const tag = a.kind==='partner' ? `<span class="a-tag partner">Partner · ${a.doc||''}</span>` : '';
  const btn = a.status==='booked' ? `<button class="btn btn-ghost btn-sm" data-done="${a.id}" type="button">Mark done</button>`
            : `<span class="a-tag done">Done</span>`;
  return `<div class="a-row"><b class="a-time">${t}</b><div><b>${a.who}</b><span class="small"> — ${a.what}</span> ${tag}</div>${btn}</div>`;
}
function renderToday(){
  const k=dkey(new Date());
  const day=db.appts.filter(a=>a.date===k).sort((x,y)=>x.h-y.h);
  const c1=day.filter(a=>a.room==='c1'), c2=day.filter(a=>a.room==='c2');
  $('#todayTitle').textContent = fmt(new Date());
  $('#todayCount').textContent = `${day.length} appointment${day.length===1?'':'s'} · ${db.reqs.filter(r=>r.status==='pending').length} request${db.reqs.filter(r=>r.status==='pending').length===1?'':'s'} waiting`;
  $('#todayC1').innerHTML = c1.map(apptRow).join('') || '<p class="small">Nothing booked. Enjoy the quiet.</p>';
  $('#todayC2').innerHTML = c2.map(apptRow).join('') || '<p class="small">Nothing booked.</p>';
  $$('[data-done]').forEach(b=>b.onclick=()=>{ const a=db.appts.find(x=>x.id===b.dataset.done); if(a){a.status='done'; save(db); render();} });
}

// ---------- calendar ----------
let calDate=new Date(); calDate.setHours(0,0,0,0);
function renderCal(){
  const room=$('#calRoom').value, k=dkey(calDate), fri=calDate.getDay()===5;
  $('#calDate').textContent=fmt(calDate);
  const from = room==='c1' && !fri ? 9 : 9;
  const rows=[];
  for(let h=9;h<24;h++){
    const a=db.appts.find(x=>x.room===room&&x.date===k&&x.h===h);
    const blocked=db.blocks.includes(room+k+h);
    const partnerOnly = room==='c1' && !fri && h>=19;
    let cell;
    if(a) cell=`<div class="a-slot busy ${a.kind}"><b>${a.who}</b><span>${a.what}${a.kind==='partner'?' · partner session':''}</span></div>`;
    else if(blocked) cell=`<button class="a-slot blockedd" data-unblock="${room+k+h}" type="button">Blocked — click to free</button>`;
    else cell=`<button class="a-slot free" data-free="${room}|${k}|${h}" type="button">${partnerOnly?'Open to partners':'Free'} — click to block or book</button>`;
    rows.push(`<div class="a-hour"><span>${pad(h)}:00</span>${cell}</div>`);
  }
  $('#calGrid').innerHTML=rows.join('');
  $$('[data-unblock]').forEach(b=>b.onclick=()=>{ db.blocks=db.blocks.filter(x=>x!==b.dataset.unblock); save(db); renderCal(); });
  $$('[data-free]').forEach(b=>b.onclick=()=>{
    const [room,k,h]=b.dataset.free.split('|');
    const who=prompt('Patient name to book this hour — or leave empty to just block it:');
    if(who===null) return;
    if(who.trim()==='') db.blocks.push(room+k+h);
    else db.appts.push({id:'m'+Date.now(), room, date:k, h:+h, who:who.trim(), what:'Booked by reception', kind:'patient', status:'booked'});
    save(db); renderCal(); renderToday();
  });
}
$('#calPrev').onclick=()=>{calDate.setDate(calDate.getDate()-1); renderCal();};
$('#calNext').onclick=()=>{calDate.setDate(calDate.getDate()+1); renderCal();};
$('#calRoom').onchange=renderCal;

// ---------- requests ----------
function renderReqs(){
  const pend=db.reqs.filter(r=>r.status==='pending');
  $('#reqBadge').hidden=!pend.length; $('#reqBadge').textContent=pend.length;
  $('#reqList').innerHTML = db.reqs.map(r=>{
    const when=`${r.date}, ${pad(r.h1)}:00–${pad(r.h2)}:00 · ${r.room==='c1'?'Clinic 1':'Clinic 2'}`;
    const act = r.status==='pending'
      ? `<div class="a-actions"><button class="btn btn-primary btn-sm" data-ok="${r.id}" type="button">Approve</button><button class="btn btn-ghost btn-sm" data-no="${r.id}" type="button">Decline</button></div>`
      : `<span class="a-tag ${r.status==='approved'?'done':'partner'}">${r.status}</span>`;
    return `<div class="a-row req"><div><b>${r.doc}</b><span class="small"> — ${r.caseT} · ${r.model}</span><br><span class="small">${when}</span></div>${act}</div>`;
  }).join('') || '<p class="small">No requests yet. They arrive here from the “Practice at Ora” page.</p>';
  $$('[data-ok]').forEach(b=>b.onclick=()=>{
    const r=db.reqs.find(x=>x.id===b.dataset.ok); r.status='approved';
    for(let h=r.h1; h<r.h2; h++) db.appts.push({id:'p'+r.id+h, room:r.room, date:r.date, h, who:r.doc, what:r.caseT, kind:'partner', doc:r.doc, status:'booked'});
    save(db); render(); toast('Approved — session placed on the calendar.');
  });
  $$('[data-no]').forEach(b=>b.onclick=()=>{ const r=db.reqs.find(x=>x.id===b.dataset.no); r.status='declined'; save(db); render(); });
}

function render(){ renderToday(); renderCal(); renderReqs(); }
gate();
