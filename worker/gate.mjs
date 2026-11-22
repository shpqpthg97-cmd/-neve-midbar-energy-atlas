import {createSyncService,syncApi,syncMcp} from './sync.mjs';
import {projectApi} from './projects.mjs';
// Role-based access: administrator account; read-only professional guests using four-digit codes.
const encoder=new TextEncoder(),cookieName='__Host-nm_access',sessionSeconds=28800,idleSeconds=600;
const securityHeaders={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Robots-Tag':'noindex, nofollow','Vary':'Cookie'};
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const random=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function digest(s){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)))}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function signature(payload,secret){const k=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,encoder.encode(payload)))}
async function passwordHash(password,salt,env){const peppered=await signature('password:'+password,env.ATLAS_SESSION_KEY);const key=await crypto.subtle.importKey('raw',encoder.encode(peppered),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
const codeHash=(code,env)=>signature('guest:'+code,env.ATLAS_SESSION_KEY);
const recoveryHash=(code,env)=>signature('recovery:'+code.replace(/[\s-]/g,'').toLowerCase(),env.ATLAS_SESSION_KEY);
const validEmail=s=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validPassword=s=>typeof s==='string'&&s.length>=12&&s.length<=128;
function response(body,status=200,headers={}){return new Response(body,{status,headers:{...securityHeaders,...headers}})}
const json=(v,status=200)=>response(JSON.stringify(v),status,{'Content-Type':'application/json; charset=utf-8'});
const owner=env=>env.DB.prepare('SELECT * FROM atlas_admin WHERE id = ?').bind('owner').first();
async function limitedBody(request){const reader=request.body?.getReader();if(!reader)return '';const chunks=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>8192){await reader.cancel();throw Error('body_limit')}chunks.push(value)}const all=new Uint8Array(length);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length}return new TextDecoder().decode(all)}
async function reserve(env,key,limit,seconds,now){return env.DB.prepare('INSERT INTO atlas_attempts (key, attempts, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE MIN(attempts + 1, ?) END, reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END RETURNING attempts, reset_at').bind(key,now+seconds,now,limit+1,now,now+seconds).first()}
async function throttle(request,env,kind){const now=Math.floor(Date.now()/1000),isGuest=kind==='guest',globalLimit=isGuest?50:100;const global=await reserve(env,kind+':global',globalLimit,isGuest?86400:3600,now);if(global.attempts>globalLimit)return Math.max(1,global.reset_at-now);const ip=await signature(request.headers.get('CF-Connecting-IP')||'unknown',env.ATLAS_SESSION_KEY);const row=await reserve(env,kind+':ip:'+ip,isGuest?5:8,900,now);if(row.attempts>(isGuest?5:8))return Math.max(1,row.reset_at-now);await env.DB.prepare('DELETE FROM atlas_attempts WHERE reset_at < ?').bind(now-86400).run();return 0}
async function issueSession(record,role,env,documentUsed=0){
 const now=Math.floor(Date.now()/1000),exp=role==='guest'&&record.expires_at?Math.min(now+sessionSeconds,record.expires_at):now+sessionSeconds,id=random(16);
 await env.DB.prepare('DELETE FROM atlas_sessions WHERE expires_at <= ? OR last_seen <= ?').bind(now,now-idleSeconds).run();
 await env.DB.prepare('INSERT INTO atlas_sessions (id,last_seen,expires_at,document_used) VALUES (?,?,?,?)').bind(id,now,exp,documentUsed).run();
 const payload=['v3',role,record.id,record.version,exp,id].join('.'),token=payload+'.'+await signature(payload,env.ATLAS_SESSION_KEY);
 return cookieName+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Strict';
}
const clearCookie=()=>cookieName+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
async function revoke(auth,env){if(auth)await env.DB.prepare('DELETE FROM atlas_sessions WHERE id=?').bind(auth.sessionId).run()}
async function session(request,env){
 const token=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||token.length>300)return null;
 const p=token.split('.');if(p.length!==7||p[0]!=='v3'||!['admin','guest'].includes(p[1])||!/^\w{1,40}$/.test(p[2])||!/^\d+$/.test(p[3])||!/^\d{10}$/.test(p[4])||!/^[a-f0-9]{32}$/.test(p[5])||!/^[a-f0-9]{64}$/.test(p[6]))return null;
 const now=Math.floor(Date.now()/1000);if(+p[4]<=now||+p[4]>now+sessionSeconds||!equal(p[6],await signature(p.slice(0,6).join('.'),env.ATLAS_SESSION_KEY)))return null;
 const live=await env.DB.prepare('SELECT * FROM atlas_sessions WHERE id=?').bind(p[5]).first();
 if(!live||live.expires_at!==+p[4]||live.last_seen+idleSeconds<=now)return null;
 const row=p[1]==='admin'?await owner(env):await env.DB.prepare('SELECT * FROM atlas_guests WHERE id = ?').bind(p[2]).first();
 if(!row||row.id!==p[2]||row.version!==+p[3]||p[1]==='guest'&&(!row.active||row.expires_at&&row.expires_at<=now))return null;
 return {role:p[1],record:row,sessionId:p[5],lastSeen:live.last_seen,expiresAt:Math.min(live.last_seen+idleSeconds,live.expires_at)};
}
function field(name,label,type='text',extra=''){return '<label for="'+name+'">'+label+'</label><input id="'+name+'" name="'+name+'" type="'+type+'" '+extra+' required>'}
function form(mode,exists){
 if(mode==='setup')return '<span class="mode-label">הקמה חד־פעמית</span><h2>החשבון שלך. ההרשאות שלך.</h2><p>החשבון שיוגדר כאן יהיה מנהל המערכת. ההקמה מוגנת בקוד הארוך שנמסר לבעל האתר.</p><form action="/access/setup" method="post">'+field('setup','קוד ההקמה שנמסר לבעל האתר','password','autocomplete="off" maxlength="32"')+field('email','מייל המנהל','email','autocomplete="username" maxlength="254"')+field('password','סיסמה — לפחות 12 תווים','password','autocomplete="new-password" minlength="12" maxlength="128"')+field('confirm','אימות הסיסמה','password','autocomplete="new-password" minlength="12" maxlength="128"')+'<button type="submit">יצירת חשבון מנהל ←</button></form><a class="secondary" href="/?mode=login">חזרה לחשבון האישי</a>';
 if(mode==='recover')return '<span class="mode-label">שחזור גישה</span><h2>חזרה לחשבון המנהל</h2><p>השתמש בקוד השחזור ששמרת בהקמת החשבון. לא נשלחת הודעת איפוס למייל.</p><form action="/access/recover" method="post">'+field('email','מייל המנהל','email','autocomplete="username"')+field('recovery','קוד שחזור','password','autocomplete="off"')+field('password','סיסמה חדשה — לפחות 12 תווים','password','autocomplete="new-password" minlength="12" maxlength="128"')+field('confirm','אימות הסיסמה','password','autocomplete="new-password" minlength="12" maxlength="128"')+'<button type="submit">שחזור החשבון ←</button></form><a class="secondary" href="/?mode=login">חזרה לחשבון האישי</a>';
 if(mode==='guest')return '<span class="mode-label">כניסת אורח</span><h2>ברוכים הבאים</h2><p>הזינו קוד בן 4 ספרות שנמסר לכם ממנהל המערכת. הכניסה מאפשרת צפייה בנתונים ושליחת הערות מקצועיות למנהל.</p><form action="/access/guest" method="post">'+field('code','קוד אורח — 4 ספרות','password','inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="off" placeholder="••••" class="pin"')+'<button type="submit">כניסת אורח ←</button></form><a class="secondary" href="/?mode=login">התחברות לחשבון האישי</a>';
 return '<span class="mode-label">כניסת מנהל</span><h2>ברוכים הבאים</h2><p>התחברו לחשבון האישי לניהול הנתונים וההרשאות.</p><form action="/access/login" method="post">'+field('email','מייל','email','autocomplete="username" maxlength="254"')+field('password','סיסמה','password','autocomplete="current-password" maxlength="128"')+'<button type="submit">כניסה לחשבון ←</button></form><a class="secondary" href="/">חזרה לכניסת אורח</a>'+(exists?'<a class="small-link" href="/?mode=recover">שכחתי סיסמה — שחזור באמצעות קוד</a>':'<a class="small-link" href="/?mode=setup">כניסה ראשונה? הגדרת מנהל המערכת</a>');
}
export function createWorker(assets,loginHtml,catalog=[],gridBase={records:[]},presentationCsp="'none'"){
 const syncService=createSyncService(catalog,gridBase);
 const page=(content,error='',status=200,headers={})=>response(loginHtml.replace('<!--CONTENT-->',content).replace('<!--ERROR-->',error?'<p class="error" role="alert">'+escape(error)+'</p>':''),status,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src "+presentationCsp+"; style-src 'unsafe-inline'; font-src data:; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'self' https://chatgpt.com",...headers});
 const login=(mode,exists,error='',status=200,headers={})=>page(form(mode,exists),error,status,headers);
 const recoveryPage=(code,headers)=>page('<span class="mode-label">החשבון מוכן</span><h2>שמור את קוד השחזור</h2><p>הקוד מוצג עכשיו בלבד. שמור אותו במקום בטוח ונפרד מהסיסמה. הוא מאפשר לאפס סיסמה ללא שליחת מייל.</p><code class="recovery-code" dir="ltr">'+escape(code.match(/.{1,6}/g).join('-'))+'</code><a class="primary-link" href="/">שמרתי — כניסה למערכת ←</a>','',200,headers);
 return {async fetch(request,env){try{
  const url=new URL(request.url),path=url.pathname;
  if(!env.DB||!env.ATLAS_SESSION_KEY||!env.ATLAS_ACCESS_HASH)return page('<h2>הכניסה אינה זמינה כעת</h2><p>יש לפנות למנהל המערכת.</p>','',503);
  if(path==='/mcp')return await syncMcp(request,env,syncService,json);
  const unsafe=!['GET','HEAD'].includes(request.method);if(unsafe&&request.headers.get('origin')!==(env.ATLAS_ORIGIN||url.origin))return json({error:'הבקשה אינה מאותו אתר.'},403);
  if(path==='/access/logout'){if(request.method!=='POST')return response(null,303,{Location:'/'});await revoke(await session(request,env),env);return response(null,303,{Location:'/', 'Set-Cookie':clearCookie()})}
  if(['/access/login','/access/guest','/access/setup','/access/recover'].includes(path)){
   if(request.method!=='POST')return response(null,303,{Location:'/'});
   if(!(request.headers.get('content-type')||'').startsWith('application/x-www-form-urlencoded'))return json({error:'Unsupported form'},415);
   const mode=path.split('/').pop(),existing=await owner(env),retry=await throttle(request,env,mode==='guest'?'guest':'admin');
   if(retry)return login(mode,!!existing,'בוצעו ניסיונות רבים. ניתן לנסות שוב בעוד '+Math.ceil(retry/60)+' דקות.',429,{'Retry-After':String(retry)});
   let body;try{body=new URLSearchParams(await limitedBody(request))}catch{return json({error:'Request too large'},413)}
   const email=(body.get('email')||'').trim().toLowerCase(),password=body.get('password')||'';
   if(mode==='setup'){
    if(existing)return login('login',true,'חשבון המנהל כבר הוגדר. יש להתחבר אליו.',409);
    const setup=(body.get('setup')||'').replace(/[\s-]/g,'').toUpperCase();if(!/^[A-Z2-9]{16}$/.test(setup)||!equal(await digest(setup),env.ATLAS_ACCESS_HASH))return login('setup',false,'קוד ההקמה אינו תקין.',401);
    if(!validEmail(email)||!validPassword(password)||password!==body.get('confirm'))return login('setup',false,'יש להזין מייל תקין ושתי סיסמאות זהות באורך 12–128 תווים.',400);
    const salt=random(16),recovery=random(18),hash=await passwordHash(password,salt,env),now=Math.floor(Date.now()/1000);
    try{await env.DB.batch([env.DB.prepare('INSERT INTO atlas_admin (id,email,password_hash,salt,recovery_hash,created_at) VALUES (?,?,?,?,?,?)').bind('owner',email,hash,salt,await recoveryHash(recovery,env),now),env.DB.prepare('INSERT INTO atlas_guests (id,name,profession,code_hash,created_at) VALUES (?,?,?,?,?)').bind('general','אורח מקצועי','גישה כללית לצפייה',await codeHash(env.ATLAS_INITIAL_GUEST_CODE,env),now)])}catch{return login('login',true,'לא ניתן להשלים את ההקמה. ייתכן שהחשבון כבר הוגדר.',409)}
    return recoveryPage(recovery,{'Set-Cookie':await issueSession(await owner(env),'admin',env)});
   }
   if(mode==='guest'){
    const code=body.get('code')||'';if(!/^\d{4}$/.test(code))return login('guest',!!existing,'יש להזין קוד תקין בן 4 ספרות.',401);
    const guest=await env.DB.prepare('SELECT * FROM atlas_guests WHERE code_hash = ?').bind(await codeHash(code,env)).first();if(!guest||!guest.active||guest.expires_at&&guest.expires_at<=Math.floor(Date.now()/1000))return login('guest',!!existing,'הקוד שגוי, בוטל או פג תוקפו.',401);
    return response(null,303,{Location:'/', 'Set-Cookie':await issueSession(guest,'guest',env)});
   }
   if(mode==='recover'){
    if(!existing||existing.email!==email||!equal(await recoveryHash(body.get('recovery')||'',env),existing.recovery_hash))return login('recover',!!existing,'פרטי השחזור אינם תקינים.',401);
    if(!validPassword(password)||password!==body.get('confirm'))return login('recover',true,'יש להזין שתי סיסמאות זהות באורך 12–128 תווים.',400);
    const salt=random(16),recovery=random(18);const changed=await env.DB.prepare('UPDATE atlas_admin SET password_hash=?,salt=?,recovery_hash=?,version=version+1 WHERE id=? AND recovery_hash=?').bind(await passwordHash(password,salt,env),salt,await recoveryHash(recovery,env),'owner',existing.recovery_hash).run();if(changed.meta.changes!==1)return login('recover',true,'קוד השחזור כבר הוחלף. יש להשתמש בקוד האחרון ששמרת.',401);return recoveryPage(recovery,{'Set-Cookie':await issueSession(await owner(env),'admin',env)});
   }
   const computed=await passwordHash(password,existing?.salt||'no-account-padding',env);
   if(!existing||existing.email!==email||!equal(computed,existing.password_hash))return login('login',!!existing,'המייל או הסיסמה שגויים.',401);
   return response(null,303,{Location:'/', 'Set-Cookie':await issueSession(existing,'admin',env)});
  }
  const auth=await session(request,env);
  if(path.startsWith('/api/sync/'))return await syncApi(request,env,auth,syncService,json);
  if(auth&&path==='/energy/grid-checks.json'&&request.method==='GET')return json(await syncService.grid(env));
  if(path.startsWith('/api/projects')||path.startsWith('/api/feedback'))return await projectApi(request,env,auth,catalog,{json,limitedBody,random,reserve});
  if(path==='/api/auth/activity'){
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   if(!auth)return json({error:'authentication_required'},401);
   const now=Math.floor(Date.now()/1000);
   const refreshed=await env.DB.prepare('UPDATE atlas_sessions SET last_seen=? WHERE id=? AND last_seen>? AND expires_at>? RETURNING expires_at').bind(now,auth.sessionId,now-idleSeconds,now).first();
   return refreshed?json({ok:true,idleSeconds,expiresAt:Math.min(now+idleSeconds,refreshed.expires_at)}):json({error:'authentication_required'},401);
  }
  if(path==='/api/auth/me')return auth?json({...(auth.role==='admin'?{role:'admin',email:auth.record.email}:{role:'guest',name:auth.record.name,profession:auth.record.profession}),idleSeconds,expiresAt:auth.expiresAt}):json({error:'authentication_required'},401);
  if(path.startsWith('/api/account')){
   if(!auth)return json({error:'יש להתחבר.'},401);if(auth.role!=='admin')return json({error:'גישה למנהל המערכת בלבד.'},403);
   if(path==='/api/account'&&request.method==='GET'){const guests=await env.DB.prepare('SELECT id,name,profession,active,expires_at,created_at FROM atlas_guests ORDER BY created_at DESC').all();return json({email:auth.record.email,guests:guests.results,role:'admin'})}
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   let input;try{input=JSON.parse(await limitedBody(request))}catch{return json({error:'בקשה לא תקינה.'},400)}
   if(path==='/api/account/guests'){
    const name=String(input.name||'').trim(),profession=String(input.profession||'').trim(),expires=Number(input.expires_at||0),code=String(input.code||'');if(!name||name.length>80||profession.length>80||!/^\d{4}$/.test(code)||!Number.isInteger(expires)||expires<0||expires&&expires<=Math.floor(Date.now()/1000))return json({error:'יש להזין שם, קוד בן 4 ספרות ותוקף עתידי או ללא תוקף.'},400);
    try{await env.DB.prepare('INSERT INTO atlas_guests (id,name,profession,code_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)').bind(random(12),name,profession,await codeHash(code,env),expires,Math.floor(Date.now()/1000)).run()}catch{return json({error:'הקוד כבר בשימוש. יש לבחור קוד אחר.'},409)}return json({ok:true});
   }
   if(path==='/api/account/guest-access'){
    if(typeof input.id!=='string'||typeof input.active!=='boolean')return json({error:'בקשה לא תקינה.'},400);await env.DB.prepare('UPDATE atlas_guests SET active=?,version=version+1 WHERE id=?').bind(input.active?1:0,input.id).run();return json({ok:true});
   }
   if(path==='/api/account/guest-code'){
    if(typeof input.id!=='string'||!/^\d{4}$/.test(String(input.code||'')))return json({error:'יש להזין קוד בן 4 ספרות.'},400);try{await env.DB.prepare('UPDATE atlas_guests SET code_hash=?,version=version+1 WHERE id=?').bind(await codeHash(input.code,env),input.id).run()}catch{return json({error:'הקוד כבר בשימוש.'},409)}return json({ok:true});
   }
   if(path==='/api/account/password'){
    const retry=await throttle(request,env,'password');if(retry)return json({error:'יש להמתין לפני ניסיון נוסף.'},429);
    if(!validPassword(input.password)||input.password!==input.confirm)return json({error:'יש להזין שתי סיסמאות זהות באורך 12–128 תווים.'},400);
    if(!equal(await passwordHash(String(input.current||''),auth.record.salt,env),auth.record.password_hash))return json({error:'הסיסמה הנוכחית שגויה.'},401);
    const salt=random(16);await env.DB.prepare('UPDATE atlas_admin SET password_hash=?,salt=?,version=version+1 WHERE id=?').bind(await passwordHash(input.password,salt,env),salt,'owner').run();return response(JSON.stringify({ok:true}),200,{'Content-Type':'application/json','Set-Cookie':await issueSession(await owner(env),'admin',env,1)});
   }
   return json({error:'Not found'},404);
  }
  if(path==='/'||path==='/index.html'){
   const requestedMode=url.searchParams.get('mode');
   if(!auth||['login','guest','setup','recover'].includes(requestedMode)){
    const exists=!!await owner(env);let mode=requestedMode||'guest';
    if(!['login','guest','setup','recover'].includes(mode))mode='guest';
    if(mode==='setup'&&exists)mode='login';
    if(auth)await revoke(auth,env);
    const messages={idle:'המערכת ננעלה לאחר 10 דקות ללא פעילות. יש להיכנס מחדש.',return:'המערכת ננעלה לאחר יציאה או רענון. יש להיכנס מחדש.',expired:'תוקף הכניסה הסתיים. יש להיכנס מחדש.'};
    return login(mode,exists,messages[url.searchParams.get('locked')]||'',200,{'Set-Cookie':clearCookie()});
   }
  }
  if(!auth)return json({error:'authentication_required'},401);
  if((path==='/'||path==='/index.html')&&request.method==='GET'){
   const claim=await env.DB.prepare('UPDATE atlas_sessions SET document_used=1 WHERE id=? AND document_used=0').bind(auth.sessionId).run();
   if(claim.meta.changes!==1){await revoke(auth,env);return login('guest',!!await owner(env),'המערכת ננעלה לאחר רענון או חזרה לאתר. יש להיכנס מחדש.',200,{'Set-Cookie':clearCookie()})}
  }
  if(!['GET','HEAD'].includes(request.method))return response('Method not allowed',405,{Allow:'GET, HEAD'});
  const asset=assets[path==='/'?'/index.html':path];if(!asset)return response('Not found',404);
  // Stored gzip keeps the Worker bundle small. Return decoded bytes to the
  // hosting proxy, which owns transport compression; otherwise it gzips twice.
  const body=request.method==='HEAD'?null:new Blob([Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'));
  return response(body,200,{'Content-Type':asset.type});
 }catch{return json({error:'שירות הכניסה אינו זמין כרגע. יש לנסות שוב מאוחר יותר.'},503)}}};
}
