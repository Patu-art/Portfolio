window.App = window.App || {};

// Emergency loader protection.
// This runs immediately, before component loading or JS imports.
setTimeout(() => {
  document.querySelector('.site-loader')?.remove();
}, 2400);

document.documentElement.classList.add('js-ready');
(async()=> {
  const load=async(name)=> {
    const el=document.querySelector(`[data-component="${name}"]`);
    if(!el)return;
    try {
      const r=await fetch(`components/${name}.html`);
      el.innerHTML=await r.text()
    } catch(e) {
      console.error(`Failed to load ${name}`,e)
    }
  }
  ;
  await Promise.all([load('header'),load('footer')]);
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  await import('./navbar.js');
  await import('./smooth-scroll.js');
  await import('./cursor.js');
  await import('./animations.js');
  await import('./comparison.js');
  await import('./counters.js');
  await import('./projects.js');
  await import('./project-carousel.js');
  await import('./validation.js');
  await import('./contact.js');
  const path=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.desktop-nav a,.mobile-menu nav a').forEach(a=> {
    if(a.getAttribute('href')===path)a.setAttribute('aria-current','page')
  }
  );
  window.dispatchEvent(new Event('app:ready'));
}
)();
