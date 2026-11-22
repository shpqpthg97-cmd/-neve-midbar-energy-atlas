const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const select={value:'streets'},status={},layers=new Set(['institutions','boundaries','plans']),tileCalls=[];
const target={getContainer:()=>({insertAdjacentElement(){}}),removeLayer:x=>layers.delete(x)};
const context={document:{createElement:()=>({querySelector:s=>s==='select'?select:status})},L:{tileLayer:(url,options)=>{const t={once:(name,f)=>t.fail=f,addTo:()=>layers.add(t)};tileCalls.push({url,options,t});return t}}};
vm.runInNewContext(fs.readFileSync('web/map-background.js','utf8'),context);context.setupMapBackground(target);
assert.equal(tileCalls[0].url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');assert.equal(tileCalls[0].options.referrerPolicy,'strict-origin-when-cross-origin');
tileCalls[0].t.fail();assert.equal(select.value,'data');assert.deepEqual([...layers],['institutions','boundaries','plans']);assert.match(status.textContent,/אינו זמין/);assert.equal(tileCalls.length,1,'no automatic retry loop');
select.value='streets';select.onchange();assert.equal(tileCalls.length,2);select.value='data';select.onchange();assert.deepEqual([...layers],['institutions','boundaries','plans']);
console.log('Passed blocked-background removal, real-origin referrer, preserved vector layers and manual data-only selection.');
