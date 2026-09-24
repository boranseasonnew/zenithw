(function(){
  function setPageLang(lang){
    const active=COPY[lang]?lang:'en';
    const text=COPY[active];
    document.documentElement.lang=active;
    const title=document.getElementById('pgTitle'); if(title)title.textContent=text.title;
    const desc=document.getElementById('pgDesc'); if(desc)desc.setAttribute('content',text.desc);
    const back=document.getElementById('pgBack'); if(back)back.textContent=text.back;
    const kicker=document.getElementById('pgKicker'); if(kicker)kicker.textContent=text.kicker;
    const h1=document.getElementById('pgH1'); if(h1)h1.innerHTML=text.h1;
    const lead=document.getElementById('pgLead'); if(lead)lead.textContent=text.lead;
    const updated=document.getElementById('pgUpdated'); if(updated&&text.updated)updated.textContent=text.updated;
    const flowFields={pgFlowSource:'flowSource',pgFlowAnalyze:'flowAnalyze',pgFlowPrepare:'flowPrepare',pgFlowDeliver:'flowDeliver',pgFlowNoAds:'flowNoAds',pgFlowNoAccount:'flowNoAccount',pgFlowNoArchive:'flowNoArchive'};
    Object.entries(flowFields).forEach(([id,key])=>{const element=document.getElementById(id);if(element&&text[key])element.textContent=text[key];});
    const body=document.getElementById('pgBody'); if(body)body.innerHTML=text.body;
    const footer=document.getElementById('pgFooter'); if(footer)footer.innerHTML=text.footer;
    if(text.nav){
      document.querySelectorAll('[data-nav-label]').forEach(element=>{const key=element.dataset.navLabel;if(text.nav[key])element.textContent=text.nav[key];});
      document.querySelectorAll('[data-nav-aria]').forEach(element=>{const key=element.dataset.navAria;if(text.nav[key])element.setAttribute('aria-label',text.nav[key]);});
    }
    document.querySelectorAll('#langSwitch button').forEach(button=>button.classList.toggle('active',button.dataset.lang===active));
    try{localStorage.setItem('zw_lang',active);}catch(_){}
  }
  window.setPageLang=setPageLang;
  let savedLanguage='tr';
  try{savedLanguage=localStorage.getItem('zw_lang')||'tr';}catch(_){}
  setPageLang(savedLanguage==='tr'?'tr':'en');
})();
