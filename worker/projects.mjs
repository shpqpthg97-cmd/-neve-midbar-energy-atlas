import '../web/project-model.js';
// All state is server-authorized and persisted in D1. The catalog comes from the built source data.
export async function projectApi(request,env,auth,catalog,helpers){
 const {json,limitedBody,random,reserve}=helpers,M=globalThis.NMProjects,url=new URL(request.url),path=url.pathname,now=Math.floor(Date.now()/1000);
 if(!auth)return json({error:'יש להתחבר מחדש.'},401);
 const admin=auth.role==='admin',author=admin?'מנהל המערכת':auth.record.name;
 const parseRow=r=>{if(!r)return null;const {asset_json,payload,...p}=r;return{...p,asset:JSON.parse(asset_json),payload:JSON.parse(payload)}};
 const readProject=id=>env.DB.prepare('SELECT * FROM atlas_projects WHERE id=?').bind(id).first();
 const date=v=>typeof v==='string'&&(v===''||/^20\d{2}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
 const string=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0);
 if(request.method==='GET'){
  if(path==='/api/projects'){const r=await env.DB.prepare('SELECT * FROM atlas_projects ORDER BY updated_at DESC,id').all();return json({projects:r.results.map(parseRow),catalog,serverTime:now})}
  if(path==='/api/feedback'){
   if(!admin)return json({error:'הערות זמינות למנהל המערכת בלבד.'},403);
   const cursor=url.searchParams.get('before');if(cursor&&!/^\d+_[a-f0-9]{32}$/.test(cursor))return json({error:'סמן עמוד לא תקין.'},400);
   const [ts,id]=(cursor||'').split('_'),q=cursor?'SELECT * FROM atlas_feedback WHERE created_at<? OR (created_at=? AND id<?) ORDER BY created_at DESC,id DESC LIMIT 51':'SELECT * FROM atlas_feedback ORDER BY created_at DESC,id DESC LIMIT 51';
   const r=await (cursor?env.DB.prepare(q).bind(+ts,+ts,id):env.DB.prepare(q)).all(),rows=r.results.slice(0,50),last=rows.at(-1);
   const counts=await env.DB.prepare("SELECT status,COUNT(*) count FROM atlas_feedback GROUP BY status").all();return json({notes:rows.map(({author_id,request_id,...r})=>r),next:r.results.length>50?last.created_at+'_'+last.id:null,counts:counts.results});
  }
  return json({error:'הנתיב לא נמצא.'},404);
 }
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(path!=='/api/feedback'&&!admin)return json({error:'עדכון פרויקטים ותיבת ההערות זמין למנהל בלבד.'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:'נדרש מידע JSON.'},415);
 let b;try{b=JSON.parse(await limitedBody(request));if(!b||typeof b!=='object'||Array.isArray(b))throw Error()}catch{return json({error:'הבקשה אינה תקינה או גדולה מדי.'},400)}
 if(path==='/api/feedback'){
  if(!string(b.body,2000,true)||!string(b.sender_name||'',80)||!['idea','question','field','risk'].includes(b.category)||!string(b.request_id,80,true)||!/^[\w-]{8,80}$/.test(b.request_id))return json({error:'יש להשלים סוג והערה של עד 2,000 תווים.'},400);
  const asset=b.asset_id?catalog.find(a=>a.id===b.asset_id):null;if(b.asset_id&&!asset)return json({error:'נכס לא מוכר.'},400);
  const previous=await env.DB.prepare('SELECT id FROM atlas_feedback WHERE author_id=? AND author_role=? AND request_id=?').bind(auth.record.id,auth.role,b.request_id).first();if(previous)return json({ok:true,id:previous.id,duplicate:true});
  const limit=await reserve(env,'feedback:'+auth.role+':'+auth.record.id,20,3600,now);if(limit.attempts>20)return json({error:'נשלחו הערות רבות בזמן קצר. ניתן לנסות שוב בהמשך.'},429);
  const id=random(16);await env.DB.prepare('INSERT INTO atlas_feedback (id,request_id,author_id,author_role,author_name,sender_name,asset_key,category,body,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(author_id,author_role,request_id) DO NOTHING').bind(id,b.request_id,auth.record.id,auth.role,author,b.sender_name?.trim()||'',asset?.key||'',b.category,b.body.trim(),now,now).run();const saved=await env.DB.prepare('SELECT id FROM atlas_feedback WHERE author_id=? AND author_role=? AND request_id=?').bind(auth.record.id,auth.role,b.request_id).first();return json({ok:true,id:saved.id},201);
 }
 if(path==='/api/feedback/update'){
  if(!['new','reviewing','done'].includes(b.status)||!string(b.admin_note||'',1000))return json({error:'סטטוס או הערת מנהל אינם תקינים.'},400);
  const r=await env.DB.prepare('UPDATE atlas_feedback SET status=?,admin_note=?,updated_at=? WHERE id=?').bind(b.status,b.admin_note?.trim()||'',now,String(b.id||'')).run();return r.meta.changes?json({ok:true}):json({error:'ההערה לא נמצאה.'},404);
 }
 if(path==='/api/projects/start'){
  const asset=catalog.find(a=>a.id===b.asset_id);if(!asset||!Object.hasOwn(M.technologies,b.technology)||!string(b.title,160,true)||!string(b.owner,120,true)||!date(b.target_date||''))return json({error:'יש לבחור נכס, סוג פרויקט, שם ואחראי; תאריך יעד חייב להיות תקין.'},400);
  const payload={tasks:Object.fromEntries(M.stages.map(([id])=>[id,{state:'not_started',owner:'',due:'',note:''}])),risks:Object.fromEntries(M.riskIds.map(id=>[id,{state:'not_checked',owner:'',due:'',note:''}])),history:[{at:now,by:author,text:'נפתח פרויקט לאיסוף ובדיקת היתכנות'}]};
  const id=random(16),r=await env.DB.prepare('INSERT INTO atlas_projects (id,asset_key,asset_json,title,technology,owner,target_date,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(asset_key) DO NOTHING').bind(id,asset.key,JSON.stringify(asset),b.title.trim(),b.technology,b.owner.trim(),b.target_date||'',JSON.stringify(payload),now,now).run();
  const saved=parseRow(await env.DB.prepare('SELECT * FROM atlas_projects WHERE asset_key=?').bind(asset.key).first());return json({project:saved,...(!r.meta.changes?{error:'כבר קיים פרויקט לנכס זה. יש להמשיך בתיק הקיים.'}:{})},r.meta.changes?201:409);
 }
 if(path==='/api/projects/update'){
  const raw=await readProject(String(b.id||''));if(!raw)return json({error:'הפרויקט לא נמצא.'},404);if(!Number.isInteger(b.version)||b.version!==raw.version)return json({error:'הפרויקט עודכן במסך אחר. רענן את הנתונים לפני שמירה.'},409);
  const p=parseRow(raw),payload=p.payload;let text='';
  if(b.kind==='task'||b.kind==='risk'){
   const task=b.kind==='task',allowed=task?M.stages.map(s=>s[0]):M.riskIds,states=task?M.taskStates:M.riskStates;
   if(!allowed.includes(b.key)||!Object.hasOwn(states,b.state)||!string(b.owner||'',120)||!date(b.due||'')||!string(b.note||'',1200))return json({error:'פרטי המשימה או החסם אינם תקינים.'},400);
   if((task&&['done','blocked'].includes(b.state)||!task&&['blocking','resolved','not_applicable'].includes(b.state))&&!b.note?.trim())return json({error:'יש לתעד הסבר או אסמכתה לפני סימון זה.'},400);
   if(p.status==='completed')return json({error:'יש להחזיר את הפרויקט לפעיל לפני שינוי המשימות או החסמים.'},409);
   payload[task?'tasks':'risks'][b.key]={state:b.state,owner:b.owner?.trim()||'',due:b.due||'',note:b.note?.trim()||'',updatedAt:now};text=(task?'משימה':'בדיקת סיכון')+' '+(task?M.stages.find(s=>s[0]===b.key)[1]:b.key)+': '+states[b.state];
  }else if(b.kind==='meta'){
   if(!Object.hasOwn(M.statuses,b.status)||!string(b.title,160,true)||!string(b.owner,120,true)||!date(b.target_date||''))return json({error:'פרטי הפרויקט אינם תקינים.'},400);
   const m=M.progress(p);if(b.status==='completed'&&(m.done!==m.total||m.blockers||m.unchecked))return json({error:'לסיום נדרש להשלים את המשימות, לבדוק את כל הסיכונים ולטפל בחסמים. זהו סיום בדיווח בלבד.'},400);
   p.title=b.title.trim();p.owner=b.owner.trim();p.target_date=b.target_date||'';p.status=b.status;text='עודכנו פרטי הפרויקט · '+M.statuses[p.status];
  }else return json({error:'סוג עדכון לא מוכר.'},400);
  payload.history=[{at:now,by:author,text},...(payload.history||[])].slice(0,50);
  const r=await env.DB.prepare('UPDATE atlas_projects SET title=?,owner=?,target_date=?,status=?,payload=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(p.title,p.owner,p.target_date,p.status,JSON.stringify(payload),now,p.id,b.version).run();return r.meta.changes?json({project:parseRow(await readProject(p.id))}):json({error:'הפרויקט עודכן במקביל. רענן לפני ניסיון נוסף.'},409);
 }
 return json({error:'הנתיב לא נמצא.'},404);
}
