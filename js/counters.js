const els=document.querySelectorAll('[data-count]');
if(els.length) {
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io=new IntersectionObserver(es=>es.forEach(e=> {
    if(!e.isIntersecting)return;
    io.unobserve(e.target);
    const el=e.target,target=Number(el.dataset.count),suffix=el.dataset.suffix||'';
    if(reduce) {
      el.textContent=target+suffix;
      return
    }
    const start=performance.now();
    const step=now=> {
      const p=Math.min(1,(now-start)/1200),v=Math.round(target*(1-Math.pow(1-p,3)));
      el.textContent=v+suffix;
      if(p<1)requestAnimationFrame(step)
    }
    ;
    requestAnimationFrame(step)
  }
  ), {
    threshold:.65
  }
  );
  els.forEach(el=>io.observe(el))
}
