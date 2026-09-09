const cursor=document.querySelector('.cursor');
const coarse=matchMedia('(pointer:coarse)').matches;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(cursor&&!coarse&&!reduce) {
  let tx=innerWidth/2,ty=innerHeight/2,x=tx,y=ty;
  cursor.style.opacity='1';
  addEventListener('pointermove',e=> {
    tx=e.clientX;
    ty=e.clientY
  }
  , {
    passive:true
  }
  );
  const tick=()=> {
    x+=(tx-x)*.17;
    y+=(ty-y)*.17;
    cursor.style.transform=`translate3d(${x-28}px,${y-28}px,0)`;
    requestAnimationFrame(tick)
  }
  ;
  tick();
  document.querySelectorAll('a,button,input,textarea,select,[data-cursor]').forEach(el=> {
    el.addEventListener('mouseenter',()=>cursor.classList.add('is-active'));
    el.addEventListener('mouseleave',()=>cursor.classList.remove('is-active'))
  }
  )
} else cursor?.remove();
