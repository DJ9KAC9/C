// Shared: nav tint on dark sections, booking-rail demo, toast
(function(){
  const nav=document.querySelector('.nav');
  const darks=[...document.querySelectorAll('section.night, .hero.night')];
  if(nav&&darks.length){
    const io=new IntersectionObserver(es=>{
      es.forEach(e=>{ if(e.isIntersecting){nav.classList.toggle('on-night',true);nav.dataset.night='1'} });
      // fallback: compute by scroll position
    },{rootMargin:'-70px 0px -85% 0px'});
    const update=()=>{
      const y=window.scrollY+70;
      const inDark=darks.some(d=>{const r=d.getBoundingClientRect();const top=r.top+window.scrollY;return y>=top&&y<top+r.height});
      nav.classList.toggle('on-night',inDark);
      nav.style.color=inDark?'#F3EFE8':'';
      nav.style.setProperty('--bg',inDark?'#1E1D1B':'');
      nav.style.setProperty('--line',inDark?'#3A3733':'');
    };
    update();window.addEventListener('scroll',update,{passive:true});
  }
  // rail demo: cycles a highlighted chip in each column
  document.querySelectorAll('.rail .chips').forEach((c,i)=>{
    const chips=[...c.children];let k=0;
    setInterval(()=>{chips.forEach(x=>x.classList.remove('on'));chips[k%chips.length].classList.add('on');k++;}, 2200+i*300);
  });
  window.toast=function(msg){
    let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);
  };
})();
