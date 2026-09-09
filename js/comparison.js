const stage=document.querySelector('[data-comparison]');
if(stage) {
  const after=stage.querySelector('.comparison-pane--after');
  const handle=stage.querySelector('.comparison-handle');
  let value=54,drag=false;
  const set=v=> {
    value=Math.max(5,Math.min(95,v));
    after.style.clipPath=`inset(0 0 0 ${value}%)`;
    handle.style.left=`${value}%`;
    handle.setAttribute('aria-valuenow',Math.round(value))
  }
  ;
  const px=x=> {
    const r=stage.getBoundingClientRect();
    return((x-r.left)/r.width)*100
  }
  ;
  handle.addEventListener('pointerdown',e=> {
    drag=true;
    handle.setPointerCapture(e.pointerId)
  }
  );
  handle.addEventListener('pointermove',e=> {
    if(drag)set(px(e.clientX))
  }
  );
  handle.addEventListener('pointerup',()=>drag=false);
  stage.addEventListener('pointerdown',e=> {
    if(!e.target.closest('.comparison-handle'))set(px(e.clientX))
  }
  );
  handle.addEventListener('keydown',e=> {
    if(e.key==='ArrowLeft') {
      e.preventDefault();
      set(value-3)
    }
    if(e.key==='ArrowRight') {
      e.preventDefault();
      set(value+3)
    }
  }
  );
  set(value)
}
