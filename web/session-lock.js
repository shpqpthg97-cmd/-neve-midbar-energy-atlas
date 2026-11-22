(function(){
 const idleMs=600000;let lastAction=Date.now(),serverDeadline=Date.now()+idleMs,lastSent=Date.now(),pending=false,locked=false;
 function cover(){document.documentElement.style.visibility='hidden'}
 function leave(){cover();try{navigator.sendBeacon('/access/logout','')}catch{}}
 function lock(reason){if(locked)return;locked=true;leave();location.replace('/?locked='+reason)}
 async function refresh(){if(pending||locked)return;pending=true;lastSent=Date.now();try{const r=await fetch('/api/auth/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.status===401)return lock('expired');if(r.ok){const d=await r.json();serverDeadline=d.expiresAt*1000}}catch{}finally{pending=false}}
 function tick(){if(locked)return;const now=Date.now();if(now-lastAction>=idleMs||now>=serverDeadline)return lock('idle');if(document.visibilityState==='visible'&&lastAction>lastSent&&now-lastSent>=45000)refresh()}
 function activity(){if(Date.now()>=serverDeadline||Date.now()-lastAction>=idleMs)return lock('idle');lastAction=Date.now();if(lastAction-lastSent>=45000)refresh()}
 for(const e of ['pointerdown','keydown','scroll','touchstart'])document.addEventListener(e,activity,{passive:true,capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick()});
 window.addEventListener('pagehide',leave);window.addEventListener('pageshow',e=>{if(e.persisted)lock('return')});
 setInterval(tick,1000);
 fetch('/api/auth/me').then(async r=>{if(!r.ok)return lock('expired');const d=await r.json();serverDeadline=d.expiresAt*1000;tick()}).catch(()=>lock('expired'));
 const indicator=document.createElement('p');indicator.className='session-indicator';indicator.textContent='נעילה לאחר 10 דקות ללא פעילות · רענון או חזרה לאתר דורשים כניסה מחדש';document.querySelector('header')?.insertAdjacentElement('afterend',indicator);
})();
