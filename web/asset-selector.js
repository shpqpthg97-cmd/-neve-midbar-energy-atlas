// Persistent hierarchy: locality -> named council/education asset -> energy card.
const previousTerritoryRender=renderTerritory;
renderTerritory=function(){
 previousTerritoryRender();const hub=$('territoryHub');if(!hub||!localityData)return;
 const records=assetDirectory().filter(r=>territoryState.locality==='all'||r.code===territoryState.locality).sort((a,b)=>a.name.localeCompare(b.name,'he'));
 const toolbar=hub.querySelector('.energy-toolbar');
 toolbar.insertAdjacentHTML('afterend',`<div class="energy-toolbar" id="namedAssetSelection"><label for="namedEnergyAsset">בחירת מוסד או מבנה</label><select id="namedEnergyAsset" style="max-width:100%"><option value="">בחר מתוך ${records.length} הרשומות ביישוב / במרחב שנבחר</option>${records.map(r=>`<option value="${esc(r.id)}">${esc(r.name)} · ${esc(r.sourceId)}${r.kw!=null?' · נתוני אנרגיה זמינים':''}</option>`).join('')}</select><button id="openNamedEnergyAsset" disabled>פתיחת כרטיס האנרגיה</button></div><p class="muted">${records.filter(r=>r.kw!=null).length} רשומות עם נתוני אנרגיה מתוך ${records.length}. חסר נתון אינו אפס פוטנציאל.</p>`);
 const choose=$('namedEnergyAsset'),button=$('openNamedEnergyAsset');
 choose.value=records.some(r=>r.id===territoryState.asset)?territoryState.asset:'';button.disabled=!choose.value;
 const show=()=>{const r=records.find(r=>r.id===choose.value);if(!r)return;if(r.group==='education')open(r.sourceId);else if(r.group==='sport')openSport(r.sourceId);else openRoof(r.sourceId)};
 choose.onchange=()=>{button.disabled=!choose.value;show()};button.onclick=show;
};
if($('territoryHub'))renderTerritory();
