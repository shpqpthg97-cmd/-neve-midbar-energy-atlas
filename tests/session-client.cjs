const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('web/session-lock.js','utf8');
async function harness(){
 let now=1000000,timer,deadline=now+600000;
 const events={},win={},requests=[],redirects=[],beacons=[],style={};
 const document={documentElement:{style},visibilityState:'visible',addEventListener:(k,f)=>events[k]=f,createElement:()=>({}),querySelector:()=>({insertAdjacentElement(){}})};
 const context={document,window:{addEventListener:(k,f)=>win[k]=f},Date:{now:()=>now},setInterval:f=>timer=f,navigator:{sendBeacon:u=>beacons.push(u)},location:{replace:u=>redirects.push(u)},fetch:async u=>{requests.push(u);if(u.endsWith('activity'))deadline=now+600000;return{ok:true,status:200,json:async()=>({expiresAt:deadline/1000})}}};
 vm.runInNewContext(source,context);const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};await flush();
 return{events,win,requests,redirects,beacons,style,document,advance:async ms=>{now+=ms;timer();await flush()},flush};
}
(async()=>{
 let h=await harness();await h.advance(599999);assert.equal(h.redirects.length,0);assert.equal(h.requests.length,1,'idle tab must not keep itself alive');await h.advance(1);assert.deepEqual(h.redirects,['/?locked=idle']);assert.equal(h.style.visibility,'hidden');assert.equal(h.beacons.length,1);
 h=await harness();await h.advance(300000);h.events.pointerdown();await h.flush();assert(h.requests.includes('/api/auth/activity'));await h.advance(599999);assert.equal(h.redirects.length,0);await h.advance(1);assert.equal(h.redirects.length,1);
 h=await harness();h.win.pagehide();assert.equal(h.style.visibility,'hidden');assert.equal(h.beacons.length,1);h.win.pageshow({persisted:true});assert.deepEqual(h.redirects,['/?locked=return']);
 h=await harness();h.document.visibilityState='hidden';await h.advance(600000);h.document.visibilityState='visible';h.events.visibilitychange();assert.deepEqual(h.redirects,['/?locked=idle']);
 console.log('Passed client idle lock, activity-only renewal, hidden-tab expiry, page exit concealment and BFCache return.');
})();
