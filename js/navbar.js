const header=document.querySelector('[data-header]');
const toggle=document.querySelector('.nav-toggle');
const menu=document.querySelector('.mobile-menu');
const setScrolled=()=>header?.classList.toggle('is-scrolled',scrollY>24);
setScrolled();
addEventListener('scroll',setScrolled, {
  passive:true
}
);
if(toggle&&menu) {
  const close=()=> {
    toggle.setAttribute('aria-expanded','false');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden','true');
    document.body.classList.remove('menu-open')
  }
  ;
  toggle.addEventListener('click',()=> {
    const open=toggle.getAttribute('aria-expanded')==='true';
    if(open)close();
    else {
      toggle.setAttribute('aria-expanded','true');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden','false');
      document.body.classList.add('menu-open')
    }
  }
  );
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  addEventListener('keydown',e=> {
    if(e.key==='Escape')close()
  }
  )
}
