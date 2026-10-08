(function(){
  if(typeof COPY==='undefined')return;
  function setPageLang(lang){
    const active=window.ZWLanguage?lang:(COPY[lang]?lang:'en');
    const text=window.ZWLanguage?ZWLanguage.copy(COPY,active):COPY[active];
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
    const nav=(window.ZW_ABOUT_NAV&&window.ZW_ABOUT_NAV[active])||text.nav;
    if(nav){
      document.querySelectorAll('[data-nav-label],[data-about-nav]').forEach(element=>{const key=element.dataset.navLabel||element.dataset.aboutNav;if(nav[key])element.textContent=nav[key];});
      document.querySelectorAll('[data-nav-aria],[data-about-nav-aria]').forEach(element=>{const key=element.dataset.navAria||element.dataset.aboutNavAria;if(nav[key])element.setAttribute('aria-label',nav[key]);});
    }
  }
  if(window.ZWLanguage)ZWLanguage.onChange(setPageLang);
  const browserLanguage=window.ZWLanguage?.current||window.ZW_ABOUT_LOCALE||((navigator.languages||[navigator.language||'en']).map(value=>String(value).toLowerCase().split('-')[0]).find(value=>COPY[value])||'en');
  setPageLang(browserLanguage);
})();
