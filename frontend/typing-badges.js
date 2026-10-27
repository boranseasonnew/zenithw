(() => {
'use strict';
const t=value=>window.TypeI18n?.t(value)||value;
const tiers=[
 {key:'bronze',label:'bronz',minimum:0,colors:['#e5b28c','#9c6348']},
 {key:'silver',label:'gümüş',minimum:5000,colors:['#f3f6fc','#94a2bb']},
 {key:'gold',label:'altın',minimum:10000,colors:['#fff09d','#e2ad32']},
 {key:'amethyst',label:'ametist',minimum:20000,colors:['#c5c7d4','#9173b9']},
 {key:'summit',label:'zirve',minimum:50000,colors:['#ffae57','#a65ff3']}
];
let sequence=0;
function tier(rating){
 if(!rating||!(Number(rating.wins)+Number(rating.losses)+Number(rating.draws)))return {key:'unranked',label:'derecesiz',minimum:0,colors:['#a7a4b2','#656273']};
 const points=Math.max(0,Math.min(50000,Number(rating.mmr)||0));
 return [...tiers].reverse().find(item=>points>=item.minimum);
}
function rankMarkup(value){
 const rank=typeof value==='string'?tiers.find(item=>item.key===value):tier(value);
 if(!rank||rank.key==='unranked')return '<svg class="rank-badge" viewBox="0 0 40 44" aria-hidden="true"><path d="M20 4 35 11v13L20 40 5 24V11Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 22h12" stroke="currentColor" stroke-width="2"/></svg>';
 const gradient='type-rank-gradient-'+(++sequence);
 return `<svg class="rank-badge rank-badge--${rank.key}" viewBox="0 0 40 44" aria-hidden="true"><defs><linearGradient id="${gradient}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${rank.colors[0]}"/><stop offset="1" stop-color="${rank.colors[1]}"/></linearGradient></defs><path d="M20 2 37 11v14L20 42 3 25V11Z" fill="url(#${gradient})"/><path d="M20 7 32 14v9L20 35 8 23v-9Z" fill="#16131f" fill-opacity=".67"/><path d="m20 12 3.1 6.1 6.8 1-4.9 4.8 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-4.9-4.8 6.8-1Z" fill="url(#${gradient})"/></svg>`;
}
function markup(profile){
 let html='';
 if(profile?.is_verified===true)html+='<button type="button" class="account-badge account-badge--verified" data-account-badge="verified" aria-label="'+t('Onaylanmış hesap')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3 2.1 3.6.3 1.4 3.3 2.5 2.6-.8 3.5.8 3.5-2.5 2.6-1.4 3.3-3.6.3L12 24l-3-2.1-3.6-.3L4 18.3l-2.5-2.6.8-3.5-.8-3.5L4 6.1l1.4-3.3L9 2.5Z" fill="#3599ff"/><path d="m6.8 12.3 3.1 3.1 7-7" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
 if(profile?.is_developer===true)html+='<button type="button" class="account-badge account-badge--developer" data-account-badge="developer" aria-label="'+t('Geliştirici')+'"><img src="/zenithw.png" alt="" aria-hidden="true" width="48" height="48" draggable="false"></button>';
 return html?'<span class="account-badges">'+html+'</span>':'';
}
function render(element,profile){if(element)element.innerHTML=markup(profile);}
window.TypeRanks={tiers,tier,markup:rankMarkup};
window.TypeBadges={markup,render};

let tooltip,owner;
function hide(){if(!tooltip)return;owner?.removeAttribute('aria-describedby');owner=null;if(tooltip.matches?.(':popover-open'))tooltip.hidePopover();tooltip.hidden=true;}
function show(button){
 if(!tooltip){tooltip=document.createElement('div');tooltip.id='type-account-badge-tooltip';tooltip.className='account-badge-tooltip';tooltip.setAttribute('role','tooltip');if(typeof tooltip.showPopover==='function')tooltip.setAttribute('popover','manual');}
 hide();owner=button;tooltip.textContent=t(button.dataset.accountBadge==='developer'?'Geliştirici':'Onaylanmış hesap');
 (typeof tooltip.showPopover==='function'?document.body:button.closest('dialog[open]')||document.body).append(tooltip);
 tooltip.hidden=false;if(typeof tooltip.showPopover==='function')tooltip.showPopover();
 const bounds=button.getBoundingClientRect(),width=tooltip.getBoundingClientRect().width;
 tooltip.style.left=Math.max(8,Math.min(innerWidth-width-8,bounds.left+bounds.width/2-width/2))+'px';
 tooltip.style.top=Math.max(8,bounds.top-tooltip.getBoundingClientRect().height-8)+'px';button.setAttribute('aria-describedby',tooltip.id);
}
document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const button=event.target.closest('[data-account-badge]');if(button&&button!==owner)show(button);});
document.addEventListener('pointerout',event=>{if(owner&&!owner.contains(event.relatedTarget)&&owner.contains(event.target))hide();});
document.addEventListener('focusin',event=>{const button=event.target.closest('[data-account-badge]');if(button)show(button);});
document.addEventListener('focusout',event=>{if(owner===event.target)hide();});
document.addEventListener('click',event=>{const button=event.target.closest('[data-account-badge]');if(button){event.preventDefault();event.stopPropagation();if(owner===button&&tooltip&&!tooltip.hidden&&event.detail===0)return;show(button);}else hide();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
})();
