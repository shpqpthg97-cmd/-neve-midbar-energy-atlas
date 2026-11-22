// Only explicit, evidence-backed joins. Never use nearest-point matching.
let linkedRoofs=null,activeEnergyInstitution=null,roofChecks=[];
function paintInstitutionEnergy(id){
 const school=data.find(d=>String(d.SEMEL_MOSAD)===String(id));if(!school)return;
 document.querySelectorAll('#energyFields').forEach(n=>n.remove());
 const roofs=linkedRoofs?.filter(r=>r.education_id===String(id))||[];const roof=roofs.length?{...roofs[0],...roofTotals(roofs)}:null;const check=roofChecks.find(c=>c.education_id===String(id));
 const section=document.createElement('section');section.id='energyFields';
 section.innerHTML='<h3>נתוני גג ופוטנציאל אנרגיה</h3>';if(check&&!roof){section.innerHTML+=`<div class="notice"><b>בדיקה בוצעה ב־${esc(check.checked_at)}</b><p>${esc(check.description)}</p>${check.evidence?`<a href="${check.evidence}" target="_blank" rel="noopener">תיעוד הבדיקה ↗</a>`:''}</div>`;}
 if(roof){
  const reviewRoofs=roofs.filter(r=>r.quality_flag==='source_zero_values_require_review');
  if(reviewRoofs.length)section.innerHTML+=`<div class="notice"><b>נתוני מקור הדורשים בירור</b><p>ב־${reviewRoofs.length} מהגגות המקור מציג אפס גם בשעות השמש. הערכים נשמרו כפי שהוצגו; אין להסיק מכך שאין היתכנות הנדסית. הגג מסומן גם בפירוט האסמכתאות.</p></div>`;
  const values=[['שטח הגג — מ״ר',roof.roof_area_m2],['שטח פנוי לסולארי — מ״ר',roof.available_solar_m2],['הספק פוטנציאלי — kW',roof.potential_kw],['ייצור צפוי בשנה — קוט״ש',roof.annual_generation_kwh],['שטח פאנלים קיימים — מ״ר',roof.existing_panels_m2],['התאמה לאגירה','דורשת נתוני צריכה ובדיקת חיבור']];
  section.innerHTML+=`<p class="pill">${esc(roof.institution_match.status)} · ${roofs.length===1?'גג אחד נבדק':roofs.length+' גגות נבדקו'}</p><div class="energygrid">${values.map(([label,v])=>`<div>${label}<b>${v==null?'לא נמסר':typeof v==='number'?fmt(v):esc(v)}</b></div>`).join('')}</div><p>${roofs.length>1?'סכום הגגות שנבדקו במוסד זה; ייתכנו גגות נוספים שטרם נבדקו':esc(roof.institution_match.scope)}. נתוני מקור ${roof.source_year} · נבדק ${roof.retrieved_at}.</p><details><summary>מקור הנתונים ואופן השיוך</summary><p>${esc(roof.institution_match.method)}.</p><p>נקודת המיקום של מוסד זה במפה מוצגת לפי הגג שאותר. הקואורדינטות המקוריות ממשרד החינוך נשמרות בשדות שלהלן.</p><p>${esc(roof.notes)}</p><p>הפוטנציאל הוא אומדן המקור, לא הספק מותקן ולא אישור הנדסי. בעלות המועצה לא אומתה. נתוני הגג זהים לאלה בשכבת הגגות ואין לסכום אותם פעמיים.</p>${roofs.map(r=>`<p><b>${esc(r.name)}</b> · ${fmt(r.potential_kw)} kW · ${fmt(r.annual_generation_kwh)} קוט״ש לשנה<br><a href="${r.institution_match.evidence}" target="_blank" rel="noopener">אסמכתת גג זה ↗</a>${r.institution_match.label_evidence?` · <a href="${r.institution_match.label_evidence}" target="_blank" rel="noopener">זיהוי המוסד במפה ↗</a>`:''}<br>${esc(r.institution_match.method)}${r.quality_flag?`<br><b>דורש בירור מול המקור:</b> ${esc(r.notes)}`:''}</p>`).join('')}</details>`;
 }else if(!check){
  section.innerHTML+=`<div class="notice">${linkedRoofs===null?'נתוני הגגות נטענים…':'טרם נמצאה התאמה מבוססת בין המוסד לגג במקור האנרגיה.'}</div><p>${school.RAMAT_DIYUK_MIKUM==='נמוכה'?'נקודת המוסד היא ברמת יישוב בלבד ולכן אינה מאפשרת לשייך גג לפי קרבה.':'נדרש לאתר ולבדוק את גג המבנה במפת המקור.'} נתוני היישוב הכוללים אינם נתוני הגג של המוסד.</p>`;
 }
 section.innerHTML+=`<a href="${energyMapURL}" target="_blank" rel="noopener">מפת האנרגיה הממשלתית ↗</a>`;
 $('fields').before(section);
}
const beforeLinkedOpen=open;open=function(id){beforeLinkedOpen(id);activeEnergyInstitution=String(id);paintInstitutionEnergy(id)};
const beforeLinkedSport=openSport;openSport=function(id){activeEnergyInstitution=null;beforeLinkedSport(id)};
const beforeLinkedRoof=openRoof;openRoof=function(id){activeEnergyInstitution=null;beforeLinkedRoof(id)};
$('detail').addEventListener('close',()=>{activeEnergyInstitution=null;$('energyFields')?.remove()});
fetch('energy/roofs.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(rs=>{linkedRoofs=rs;if(activeEnergyInstitution&&$('detail').open)paintInstitutionEnergy(activeEnergyInstitution);applyRoofMapLocations()}).catch(()=>{if(activeEnergyInstitution&&$('detail').open)$('energyFields').innerHTML='<h3>נתוני גג ופוטנציאל אנרגיה</h3><p>טעינת הנתונים נכשלה. יש לרענן את העמוד.</p>'});

function applyRoofMapLocations(){if(!linkedRoofs)return;data.forEach(d=>{const r=linkedRoofs.find(r=>r.education_id===String(d.SEMEL_MOSAD));if(r){d._energyRoofLocation={x:r.x,y:r.y};d._energyRoofLocality=r.locality_code?r.locality:null}});render()}
const beforeRoofLocationRender=render;render=function(){if(linkedRoofs)data.forEach(d=>{const r=linkedRoofs.find(r=>r.education_id===String(d.SEMEL_MOSAD));if(r){d._energyRoofLocation={x:r.x,y:r.y};d._energyRoofLocality=r.locality_code?r.locality:null}});beforeRoofLocationRender()};
fetch('energy/roof-checks.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{roofChecks=rows;renderTerritory();if(activeEnergyInstitution&&$('detail').open)paintInstitutionEnergy(activeEnergyInstitution)}).catch(()=>{});
