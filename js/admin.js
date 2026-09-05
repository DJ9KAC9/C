// Ora clinic portal — client-side prototype. State persists in this browser's
// localStorage; the Supabase build replaces it with a real database and roles.
const STAFF = ['awen.halasa71@gmail.com', 'awe.halasa71@gmail.com', 'hello@ora.clinic'];
const PASS_SHA256 = 'ea26f75222b790fc904d2c8150fa1914c9e1ff95c1eb0a5b0cc43434895da1a9';
async function sha256(t){const b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.toISOString().slice(0,10);
const fmt=d=>d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

// ---------- store ----------
const DB_KEY='ora-admin-v2'; // v2: production store, starts empty
function load(){ try{return JSON.parse(localStorage.getItem(DB_KEY))||null}catch(e){return null} }
function save(db){ try{localStorage.setItem(DB_KEY, JSON.stringify(db))}catch(e){} }

function seed(){ return {appts:[], reqs:[], blocks:[], txns:[], seeded:true}; }
let db = load() || seed();
db.txns=db.txns||[]; db.appts=db.appts||[]; db.reqs=db.reqs||[]; db.blocks=db.blocks||[]; db.seeded=true;
save(db);

// ---------- gate ----------
function signedIn(){ try{return localStorage.getItem('ora-admin-user')}catch(e){return null} }
function gate(){
  const u=signedIn();
  if(u){ $('#gate').hidden=true; $('#portal').hidden=false; $('#whoami').textContent=u; render(); }
  else { $('#gate').hidden=false; $('#portal').hidden=true; }
}
$('#gGo').onclick=async ()=>{
  const e=($('#gEmail').value||'').trim().toLowerCase();
  const ok = STAFF.includes(e) && (await sha256($('#gPass').value||''))===PASS_SHA256;
  if(ok){ localStorage.setItem('ora-admin-user',e); $('#gErr').hidden=true; gate(); }
  else $('#gErr').hidden=false;
};
['gEmail','gPass'].forEach(id=>document.getElementById(id).addEventListener('keydown',ev=>{ if(ev.key==='Enter') $('#gGo').click(); }));
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
    const hrs=r.h2-r.h1, monthly=/Monthly/.test(r.model);
    const amt = monthly ? 600 : Math.max(Math.round((parseInt(r.model.replace(/[^0-9]/g,''))||300)*0.60), 25);
    db.txns.push({id:'ts'+r.id, date:r.date, who:r.doc, what:(monthly?'Monthly residency · ':'60% share · ')+r.caseT, amount:amt, kind:'partner', status:'pending'});
    save(db); render(); toast('Approved — session placed on the calendar.');
  });
  $$('[data-no]').forEach(b=>b.onclick=()=>{ const r=db.reqs.find(x=>x.id===b.dataset.no); r.status='declined'; save(db); render(); });
}

// ---------- bookings ----------
function renderBookings(){
  const q=($('#bookSearch').value||'').toLowerCase();
  const today=dkey(new Date());
  const up=db.appts.filter(a=>a.date>=today && a.kind==='patient').sort((a,b)=>a.date===b.date?a.h-b.h:(a.date<b.date?-1:1));
  const list=up.filter(a=>!q||a.who.toLowerCase().includes(q)).slice(0,60);
  $('#bookList').innerHTML=list.map(a=>{
    const room=a.room==='c1'?'Clinic 1':'Clinic 2';
    const cancel = a.status!=='cancelled' ? `<button class="btn btn-ghost btn-sm" data-cancel="${a.id}" type="button">Cancel</button>` : '<span class="a-tag">cancelled</span>';
    return `<div class="a-row"><b class="a-time">${a.date.slice(5)} · ${pad(a.h)}:00</b><div><b>${a.who}</b><span class="small"> — ${a.what} · ${room}</span></div>${cancel}</div>`;
  }).join('')||'<p class="small">No upcoming bookings match.</p>';
  $$('[data-cancel]').forEach(b=>b.onclick=()=>{ const a=db.appts.find(x=>x.id===b.dataset.cancel); if(a&&confirm('Cancel '+a.who+'\u2019s booking? The hour becomes free.')){ db.appts=db.appts.filter(x=>x!==a); save(db); render(); }});
}
$('#bookSearch') && $('#bookSearch').addEventListener('input', ()=>renderBookings());
// ---------- money ----------
const jod=n=>n+' JOD';
function renderMoney(){
  const today=dkey(new Date());
  const week=dkey(new Date(Date.now()-6*864e5));
  const t=db.txns||[];
  const collToday=t.filter(x=>x.kind==='patient'&&x.status==='paid'&&x.date===today).reduce((s,x)=>s+x.amount,0);
  const collWeek=t.filter(x=>x.kind==='patient'&&x.status==='paid'&&x.date>=week&&x.date<=today).reduce((s,x)=>s+x.amount,0);
  const owed=t.filter(x=>x.kind==='partner'&&x.status==='pending').reduce((s,x)=>s+x.amount,0);
  const share=t.filter(x=>x.kind==='partner').reduce((s,x)=>s+x.amount,0);
  $('#mToday').textContent=jod(collToday); $('#mWeek').textContent=jod(collWeek);
  $('#mOwed').textContent=jod(owed); $('#mShare').textContent=jod(share);
  const rows=[...t].sort((a,b)=>a.date<b.date?1:-1).slice(0,50);
  $('#txnList').innerHTML=rows.map(x=>{
    const act = x.status==='pending'
      ? `<button class="btn btn-primary btn-sm" data-settle="${x.id}" type="button">${x.kind==='partner'?'Mark transferred':'Mark paid'}</button>`
      : `<span class="a-tag done">${x.kind==='partner'?'transferred':'paid'}</span>`;
    return `<div class="a-row"><b class="a-time">${x.date.slice(5)}</b><div><b>${x.who}</b><span class="small"> — ${x.what}</span></div><div style="display:flex;gap:12px;align-items:center"><b>${jod(x.amount)}</b>${act}</div></div>`;
  }).join('')||'<p class="small">No transactions yet.</p>';
  $$('[data-settle]').forEach(b=>b.onclick=()=>{ const x=db.txns.find(y=>y.id===b.dataset.settle); x.status=x.kind==='partner'?'transferred':'paid'; save(db); renderMoney(); });
}
function render(){ renderToday(); renderCal(); renderReqs(); renderBookings(); renderMoney(); }
gate();
