/* Build Journey: cache-first, live-refresh repository map.
   The checked-in index paints immediately; GitHub refreshes it in the background. */
const journeyRoot=document.querySelector('[data-journey-route]');
if(journeyRoot){
 const OWNER='Patu-art';
 const count=document.querySelector('[data-repository-count]');
 const status=document.querySelector('[data-journey-status]');
 const filterRoot=document.querySelector('[data-journey-filter]');
 let items=[],activeFilter='all';

 const titleCase=name=>String(name||'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
 const dayNumber=name=>{const m=String(name||'').match(/^day-?0*(\d+)$/i);return m?Number(m[1]):null};
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return''}};
 const normalize=raw=>{
   if(!raw||raw.private||raw.is_fork||raw.fork||raw.archived||!/^[a-z0-9_.-]{1,100}$/i.test(raw.name||''))return null;
   return {name:raw.name,title:String(raw.title||titleCase(raw.name)).slice(0,100),
    description:String(raw.description||'Open the repository to explore this build.').slice(0,260),
    language:String(raw.language||'PROJECT').slice(0,35),url:safeURL(raw.url),live:safeURL(raw.live),
    created_at:String(raw.created_at||''),day:dayNumber(raw.name),image:String(raw.image||raw.thumbnail||'').replace(/^\/+/, '')};
 };
 const order=list=>[...list].sort((a,b)=>{
   if(a.day!==null&&b.day!==null)return a.day-b.day;
   const at=Date.parse(a.created_at)||0,bt=Date.parse(b.created_at)||0;
   return at-bt||String(a.name).localeCompare(String(b.name));
 });
 function node(repo,index){
   const row=document.createElement('article'),challenge=repo.day!==null;
   row.className='journey-item '+(challenge?'journey-item--challenge':'journey-item--side');row.dataset.kind=challenge?'challenge':'side';row.dataset.route=String(index%8);
   const axis=document.createElement('div');axis.className='journey-item__axis';axis.setAttribute('aria-hidden','true');
   const button=document.createElement('button');button.type='button';button.className='journey-level';button.setAttribute('aria-haspopup','dialog');
   button.setAttribute('aria-label',(challenge?'Day '+repo.day:repo.title)+': open project details');
   const badge=document.createElement('span');badge.className='journey-level__badge';badge.textContent=challenge?'Day '+repo.day:'★';
   button.append(badge);button.addEventListener('click',()=>openProject(repo,challenge));
   row.append(axis,button);return row;
 }
 function openProject(repo,challenge){
   let dialog=document.querySelector('[data-project-dialog]');
   if(!dialog){
     dialog=document.createElement('dialog');dialog.className='journey-dialog';dialog.dataset.projectDialog='';
     dialog.innerHTML='<button class="journey-dialog__close" type="button" aria-label="Close project">×</button><div class="journey-dialog__media"></div><div class="journey-dialog__copy"><p class="journey-dialog__eyebrow"></p><h3></h3><p class="journey-dialog__description"></p><div class="journey-dialog__links"></div></div>';
     document.body.append(dialog);dialog.querySelector('.journey-dialog__close').addEventListener('click',()=>dialog.close());
     dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
   }
   const media=dialog.querySelector('.journey-dialog__media');media.replaceChildren();
   if(repo.image&&/^(assets\/)[a-z0-9_./-]+\.(png|webp|jpe?g)$/i.test(repo.image)){
     const img=document.createElement('img');img.src=repo.image;img.alt='Preview of '+repo.title;img.loading='lazy';media.append(img);
   }else{const missing=document.createElement('div');missing.className='journey-dialog__missing';missing.textContent='PREVIEW PENDING';media.append(missing)}
   dialog.querySelector('.journey-dialog__eyebrow').textContent=challenge?'100 DAYS · DAY '+String(repo.day).padStart(2,'0'):'SIDE PROJECT';
   dialog.querySelector('h3').textContent=repo.title;dialog.querySelector('.journey-dialog__description').textContent=repo.description;
   const links=dialog.querySelector('.journey-dialog__links');links.replaceChildren();
   if(repo.live){const a=document.createElement('a');a.href=repo.live;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Live demo ↗';links.append(a)}
   if(repo.url){const a=document.createElement('a');a.href=repo.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Code ↗';links.append(a)}
   dialog.showModal();
 }
 function render(list){
   const clean=order(list.map(normalize).filter(Boolean));
   const seen=new Set();items=clean.filter(r=>{const k=r.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
   const visible=items.filter(r=>activeFilter==='all'||(activeFilter==='challenge')===(r.day!==null));
   if(!visible.length){journeyRoot.replaceChildren(Object.assign(document.createElement('p'),{className:'journey-loading',textContent:'No projects in this view yet.'}));return}
   journeyRoot.replaceChildren(...visible.map(node));
   requestAnimationFrame(drawSnake);
   if(count)count.textContent=items.length+' PUBLIC REPOSITORIES';
 }
 function drawSnake(){
   journeyRoot.querySelector('.journey-snake')?.remove();
   const rows=[...journeyRoot.querySelectorAll('.journey-item:not([hidden])')];if(!rows.length)return;
   const box=journeyRoot.getBoundingClientRect(),ns='http://www.w3.org/2000/svg';
   const svg=document.createElementNS(ns,'svg');svg.classList.add('journey-snake');svg.setAttribute('aria-hidden','true');
   svg.setAttribute('viewBox','0 0 '+Math.max(1,box.width)+' '+Math.max(1,box.height));svg.setAttribute('preserveAspectRatio','none');
   const pattern=[.16,.76,.34,.88,.57,.12,.68,.27];
   const pts=rows.map((row,i)=>{const r=row.getBoundingClientRect(),x=box.width*pattern[i%pattern.length];row.style.setProperty('--level-x',(pattern[i%pattern.length]*100)+'%');return{x,y:r.top-box.top+r.height/2}});
   let d='M '+pts[0].x+' '+pts[0].y;
   for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dy=b.y-a.y,wide=Math.abs(b.x-a.x),bend=Math.min(dy*.72,Math.max(48,wide*.38));const sign=i%3===0?-1:1;const c1x=a.x+Math.min(box.width*.12,wide*.22)*sign,c2x=b.x-Math.min(box.width*.12,wide*.22)*sign;d+=' C '+c1x+' '+(a.y+bend)+', '+c2x+' '+(b.y-bend)+', '+b.x+' '+b.y}
   const shadow=document.createElementNS(ns,'path');shadow.setAttribute('d',d);shadow.setAttribute('class','journey-snake__shadow');
   const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class','journey-snake__path');svg.append(shadow,path);journeyRoot.prepend(svg);
 } let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawSnake,120)},{passive:true});
 async function stored(){
   const response=await fetch('data/repos.json',{cache:'no-store'});if(!response.ok)throw new Error('Saved index HTTP '+response.status);
   const data=await response.json();return Array.isArray(data.repositories)?data.repositories:[];
 }
 async function live(cached){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
   try{
    const response=await fetch('https://api.github.com/users/'+OWNER+'/repos?type=owner&per_page=100&sort=created',{headers:{Accept:'application/vnd.github+json'},signal:controller.signal});
    if(!response.ok)throw new Error('GitHub HTTP '+response.status);
    const raw=await response.json(),index=new Map(cached.map(r=>[String(r.name).toLowerCase(),r]));
    return raw.filter(r=>r&&!r.private&&!r.fork&&!r.archived).map(r=>{const old=index.get(String(r.name).toLowerCase());
      return {...old,name:r.name,title:old?.title||titleCase(r.name),description:r.description?.trim()||old?.description||'Open the repository to explore this build.',language:r.language||old?.language||'PROJECT',url:r.html_url,live:r.homepage?.startsWith('https://')?r.homepage:(r.has_pages?'https://patu-art.github.io/'+encodeURIComponent(r.name)+'/':''),created_at:r.created_at||old?.created_at||''}
    });
   }finally{clearTimeout(timer)}
 }
 filterRoot?.addEventListener('click',e=>{const button=e.target.closest('button[data-filter]');if(!button)return;activeFilter=button.dataset.filter;filterRoot.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render(items)});
 stored().then(cached=>{render(cached);return live(cached).then(fresh=>render(fresh)).catch(error=>console.warn('Live repository refresh unavailable; using saved index.',error))})
 .catch(()=>live([]).then(render).catch(()=>{journeyRoot.innerHTML='<p class="journey-loading">Repository information is temporarily unavailable. Use the GitHub link below to browse the work.</p>';if(status){status.hidden=false;status.textContent='Projects could not be refreshed.'}}));
}