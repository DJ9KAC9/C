// ORA i18n — English/Arabic with RTL. Static UI is bilingual; the interactive
// booking flows remain English in this phase (noted in BLUEPRINT.md).
const AR = {
  n_care:'الرعاية', n_lounge:'ركن البشرة', n_consult:'استشارة أونلاين', n_spec:'الأطباء',
  n_journal:'المدوّنة', n_pro:'للأطباء', n_book:'احجز', leave:'مغادرة الحجز',
  h1:'دقة تثق بها. وهدوء <em>تشعر به.</em>',
  lede:'عيادة أسنان وركن للبشرة في مادبا، بُنيت على فكرة واحدة: أفضل رعاية هي الهادئة، الدقيقة، والتي تدور حولك أنت.',
  cta_book:'احجز موعدك', cta_explore:'تعرّف على خدماتنا',
  pain:'تشعر بألم الآن؟ <b>خذ المسار السريع</b>',
  loc:'مادبا، الأردن · السبت–الخميس ٩:٠٠–٢٠:٠٠ · ٠٧٩٢٢٢٢٤٢٧',
  care_h:'أربع طرق نعتني بك فيها.',
  care_l:'طب الأسنان، التجميل، البشرة، وطبيب على شاشتك حين يتعذر حضورك. فريق واحد، ومعيار واحد.',
  s1h:'طب الأسنان', s2h:'تجميل الأسنان', s3h:'ركن البشرة', s4h:'استشارة أونلاين',
  gal_h:'العيادة كما هي.', spec_h:'الأطباء.', book_h:'الحجز، من دون مكالمة.',
  pro_h:'لا تملك عيادة؟ اعمل في أورا.', pro_cta:'الغرف والأسعار',
  end_h:'متى ما كنت جاهزًا، نحن مستعدون.',
};
(function(){
  const KEY='ora-lang';
  const btn=document.getElementById('langToggle');
  const EN={}; // captured from the DOM on first switch
  function capture(){
    document.querySelectorAll('[data-i18n],[data-i18n-html]').forEach(el=>{
      const k=el.dataset.i18n||el.dataset.i18nHtml;
      if(!(k in EN)) EN[k]= el.dataset.i18nHtml!==undefined ? el.innerHTML : el.textContent;
    });
  }
  function apply(lang){
    document.documentElement.lang = lang;
    document.documentElement.dir = lang==='ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k=el.dataset.i18n, v = lang==='ar' ? AR[k] : EN[k];
      if(v!==undefined) el.textContent=v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{
      const k=el.dataset.i18nHtml, v = lang==='ar' ? AR[k] : EN[k];
      if(v!==undefined) el.innerHTML=v;
    });
    if(btn) btn.textContent = lang==='ar' ? 'EN' : 'عربي';
    try{ localStorage.setItem(KEY,lang) }catch(e){}
  }
  capture();
  let lang='en';
  try{ lang = localStorage.getItem(KEY)||'en' }catch(e){}
  if(lang==='ar') apply('ar');
  if(btn) btn.onclick=()=>apply(document.documentElement.lang==='ar'?'en':'ar');
})();
