// Details keeps the choices usable without JavaScript; enhance dismissal like a menu.
const pickers=[...document.querySelectorAll('.channel-picker,.contact-picker')];
for(const picker of pickers)picker.addEventListener('toggle',()=>{
  if(picker.open)for(const other of pickers)if(other!==picker)other.open=false;
});
document.addEventListener('click',event=>{for(const picker of pickers)if(picker.open&&!picker.contains(event.target))picker.open=false;});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  for(const picker of pickers)if(picker.open){picker.open=false;picker.querySelector('summary').focus();event.preventDefault();}
});
