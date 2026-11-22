// The browser sends its own User-Agent and the real origin, as required by OSM.
function setupMapBackground(target){
 const control=document.createElement('div');control.className='map-background-controls';
 control.innerHTML='<label>רקע המפה <select id="mapBackground"><option value="streets">רחובות — OpenStreetMap</option><option value="data">נתונים ושכבות בלבד</option></select></label><span id="mapBackgroundStatus" role="status">רקע חיצוני; נתוני הנכסים נשמרים בנפרד.</span>';
 target.getContainer().insertAdjacentElement('beforebegin',control);
 const select=control.querySelector('select'),status=control.querySelector('[role=status]');let background=null,failed=false;
 function apply(){if(background){target.removeLayer(background);background=null}if(select.value==='data'){status.textContent=failed?'רקע הרחובות אינו זמין כרגע. הנכסים, הגבולות והתוכניות ממשיכים לפעול.':'מוצגים הנכסים והשכבות ללא רקע רחובות.';return}
  status.textContent='רקע: OpenStreetMap · נתוני הנכסים מהמקורות המצוינים באתר.';
  background=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',updateWhenIdle:true,keepBuffer:1});
  background.once('tileerror',()=>{failed=true;select.value='data';apply()});background.addTo(target);
 }
 select.onchange=()=>{failed=false;apply()};apply();
}
