(() => {
'use strict';
const $=id=>document.getElementById(id), config=window.ZENITH_TYPE_CONFIG;
const SESSION_KEY='zenith-type:session:v1';
let session=null,member=null,refreshing=null,authMode='login',busy=false;
try {session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{}
const notify=message=>window.dispatchEvent(new CustomEvent('type:toast',{detail:message}));
const open=dialog=>{if(!dialog.open)dialog.showModal();};
function saveSession(value){session=value;try{if(value)localStorage.setItem(SESSION_KEY,JSON.stringify({access_token:value.access_token,refresh_token:value.refresh_token,expires_at:value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600)}));else localStorage.removeItem(SESSION_KEY);}catch{notify('Oturum bu tarayıcıda kalıcı saklanamadı.');}}
async function token(){
 if(!session)return null;
 if((session.expires_at||0)>Date.now()/1000+45)return session.access_token;
 if(!refreshing)refreshing=(async()=>{
  const response=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  const data=await response.json();if(!response.ok){saveSession(null);member=null;renderAuth();throw Error('Oturumun sona erdi. Tekrar giriş yap.');}
  saveSession(data);return data.access_token;
 })().finally(()=>{refreshing=null;});
 return refreshing;
}
async function request(action,body={},authenticated=true){
 if(!config?.url||!config?.key)throw Error('Çevrimiçi bağlantı henüz yapılandırılmadı.');
 const access=authenticated?await token():null;
 if(authenticated&&!access)throw Error('Önce giriş yap.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(config.url+'/functions/v1/typing-api/'+action,{method:'POST',headers:{apikey:config.key,...(access?{Authorization:'Bearer '+access}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body),signal:controller.signal});
  const data=await response.json().catch(()=>({error:'Sunucu yanıtı okunamadı.'}));
  if(!response.ok){const error=new Error(data.error||'İşlem tamamlanamadı.');error.status=response.status;throw error;}
  return data;
 }catch(error){if(error.name==='AbortError')throw Error('Bağlantı zaman aşımına uğradı.');if(error instanceof TypeError)throw Error('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.');throw error;}
 finally{clearTimeout(timeout);}
}
function avatarURL(profile){return profile?.avatar_path?config.url+'/storage/v1/object/public/typing-avatars/'+profile.avatar_path.split('/').map(encodeURIComponent).join('/')+'?v='+profile.avatar_version:null;}
function showAvatar(element,profile){element.replaceChildren();const url=avatarURL(profile);if(url){const image=new Image();image.src=url;image.alt='';element.append(image);}else element.textContent=(profile?.display_name||'?')[0].toLocaleUpperCase('tr-TR');}
function renderAuth(){
 $('auth-guest').hidden=!!member;$('auth-member').hidden=!member;$('account-label').textContent=member?member.display_name:(window.TypeI18n?.t('giriş')||'giriş');
 showAvatar($('avatar'),member);
 window.TypeBadges.render($('account-badges'),member);window.TypeBadges.render($('member-badges'),member);
 $('remove-avatar').hidden=!member?.avatar_path;
 if(member){showAvatar($('profile-avatar'),member);$('member-name').textContent=member.display_name;$('member-username').textContent='#'+member.account_tag;$('member-display-name').value=member.display_name;}
 $('ranked-description').textContent=member?'Metin ve sonuç sunucuda doğrulanır.':'Giriş yap · 15 / 30 / 60 / 120 sn';
 window.dispatchEvent(new CustomEvent('type:auth',{detail:{profile:member}}));
}
function setMode(mode){
 authMode=mode;$('auth-identity-label').textContent=mode==='register'?'görünen ad':'hesap kodu / eski kullanıcı adı';$('auth-username').placeholder=mode==='register'?'istediğin isim':'12 karakterlik hesap kodun';$('recovery-field').hidden=mode!=='recover';$('auth-recovery').required=mode==='recover';$('auth-password-label').textContent=mode==='recover'?'yeni şifre':'şifre';$('auth-password').autocomplete=mode==='login'?'current-password':'new-password';$('auth-password').value='';$('auth-recovery').value='';$('account-error').textContent='';
 $('auth-note').textContent=mode==='register'?'İsimler ortak olabilir. Kayıt sonrası verilen benzersiz hesap kodunla giriş yaparsın. E-posta istemeyiz.':mode==='recover'?'Kaydettiğin kodla yeni şifre belirle. Başarılı işlemden sonra yeni bir kod verilir.':'E-posta veya telefon istemiyoruz.';
 $('auth-submit').textContent=mode==='register'?'hesap oluştur':mode==='recover'?'hesabı kurtar':'giriş yap';
 document.querySelectorAll('[data-auth-mode]').forEach(b=>{const active=b.dataset.authMode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function showRecovery(code,recovered=false){
 $('recovery-code').textContent=code;$('recovery-note').textContent=recovered?'Eski kod artık geçersiz. Yeni şifrenle giriş yapabilirsin.':'';
 $('copy-recovery').textContent='kopyala';$('recovery-dialog').showModal();
}
async function submitWork(button,work){
 if(busy)return;busy=true;const text=button.textContent;button.disabled=true;button.textContent='bekle…';$('account-error').textContent='';
 try{await work();}catch(error){$('account-error').textContent=error.message;}finally{busy=false;button.disabled=false;button.textContent=text;}
}
$('account-open').addEventListener('click',()=>{
 if(document.body.classList.contains('running'))return;
 $('account-error').textContent='';open($('account-dialog'));
 // Refresh server-owned badges for tabs kept open across a backend rollout.
 const memberId=member?.user_id;
 if(memberId)void request('me').then(data=>{if(member?.user_id===memberId){member=data.profile;renderAuth();}}).catch(error=>{if(member?.user_id===memberId)$('account-error').textContent=error.message;});
});
document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.authMode)));
$('auth-form').addEventListener('submit',event=>{
 event.preventDefault();const mode=authMode;
 void submitWork($('auth-submit'),async()=>{
  const data=await request(mode,{username:$('auth-username').value.trim(),password:$('auth-password').value,code:$('auth-recovery').value},false);
  $('auth-password').value='';$('auth-recovery').value='';
  if(mode==='recover'){saveSession(null);member=null;setMode('login');renderAuth();showRecovery(data.recoveryCode,true);return;}
  saveSession(data.session);member=data.profile;renderAuth();$('account-dialog').close();
  if(data.recoveryCode){showRecovery(data.recoveryCode);$('recovery-note').textContent='Giriş için hesap kodun: #'+member.account_tag;}else notify('Giriş yapıldı.');
 });
});
$('copy-recovery').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('recovery-code').textContent);$('copy-recovery').textContent='kopyalandı';}
 catch{const range=document.createRange();range.selectNodeContents($('recovery-code'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);$('recovery-note').textContent='Kodu seçtim; Ctrl+C ile kopyalayabilirsin.';}
});
$('saved-recovery').addEventListener('click',()=>{$('recovery-code').textContent='';$('recovery-dialog').close();});
$('recovery-dialog').addEventListener('close',()=>{$('recovery-code').textContent='';});
$('copy-account-id').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(member.account_tag);notify('Hesap kodu kopyalandı.');}catch{notify('Hesap kodun: '+member.account_tag);}});
$('my-public-profile').addEventListener('click',()=>{const tag=member.account_tag;$('account-dialog').close();window.TypeProfiles?.open(tag);});
$('profile-form').addEventListener('submit',event=>{event.preventDefault();void submitWork(event.submitter,async()=>{const data=await request('profile',{displayName:$('member-display-name').value});member=data.profile;renderAuth();notify('Profil kaydedildi.');});});
$('password-form').addEventListener('submit',event=>{event.preventDefault();void submitWork(event.submitter,async()=>{const data=await request('password',{currentPassword:$('current-password').value,password:$('new-password').value});saveSession(data.session);$('password-form').reset();notify('Şifre değiştirildi. Diğer oturumlar kapatıldı.');});});
$('logout-button').addEventListener('click',()=>void submitWork($('logout-button'),async()=>{await request('logout');saveSession(null);member=null;renderAuth();$('account-dialog').close();notify('Çıkış yapıldı.');}));
$('remove-avatar').addEventListener('click',()=>void submitWork($('remove-avatar'),async()=>{const data=await request('avatar-remove');member=data.profile;renderAuth();notify('Fotoğraf kaldırıldı.');}));
$('profile-avatar-button').addEventListener('click',()=>$('avatar-upload').click());
$('avatar-upload').addEventListener('change',async()=>{
 const file=$('avatar-upload').files[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){$('account-error').textContent='En fazla 8 MB PNG, JPG veya WebP seç.';$('avatar-upload').value='';return;}
 $('profile-avatar-button').disabled=true;
 try{
  const image=await createImageBitmap(file),size=Math.min(image.width,image.height),canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;
  const context=canvas.getContext('2d');context.fillStyle='#24242d';context.fillRect(0,0,384,384);context.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,384,384);image.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.87));if(!blob)throw Error('Görsel işlenemedi.');
  const form=new FormData();form.append('file',blob,'avatar.jpg');const data=await request('avatar',form);member=data.profile;renderAuth();notify('Fotoğraf güncellendi.');
 }catch(error){$('account-error').textContent=error.message||'Görsel yüklenemedi.';}finally{$('profile-avatar-button').disabled=false;$('avatar-upload').value='';}
});
window.TypeOnline={request,avatarURL,get profile(){return member;},get signedIn(){return !!member;},openLogin(){setMode('login');open($('account-dialog'));}};
// One refresh loop serves concurrent requests; passwords and recovery codes are never persisted.
if(session)window.TypeOnline.ready=request('me').then(data=>{member=data.profile;renderAuth();}).catch(error=>{if(error.status===401||error.status===403){saveSession(null);member=null;}renderAuth();});
else {renderAuth();window.TypeOnline.ready=Promise.resolve();}
})();
