document.querySelectorAll('.faq-item button').forEach(btn=>btn.addEventListener('click',()=> {
  const item=btn.closest('.faq-item');
  const open=item.classList.toggle('is-open');
  btn.setAttribute('aria-expanded',String(open));
  btn.querySelector('i').textContent=open?'−':'+'
}
));
document.querySelectorAll('form[novalidate]').forEach(form=>form.addEventListener('invalid',e=> {
  e.target.classList.add('is-invalid')
}
,true));
