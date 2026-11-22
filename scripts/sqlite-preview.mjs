// D1-compatible SQLite adapter for development and tests, never included in the published Worker.
import{DatabaseSync}from'node:sqlite';import fs from'node:fs';
export function localDatabase(file=':memory:'){
 const sqlite=new DatabaseSync(file);if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='atlas_admin'").get())sqlite.exec(fs.readFileSync(new URL('../drizzle/0000_account_access.sql',import.meta.url),'utf8'));
 if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='atlas_sessions'").get())sqlite.exec(fs.readFileSync(new URL('../drizzle/0001_session_lock.sql',import.meta.url),'utf8'));
 if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='atlas_projects'").get())sqlite.exec(fs.readFileSync(new URL('../drizzle/0002_projects_feedback.sql',import.meta.url),'utf8'));
 if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='atlas_sync_runs'").get())sqlite.exec(fs.readFileSync(new URL('../drizzle/0003_source_sync.sql',import.meta.url),'utf8'));
 function prepare(sql){let args=[];const api={bind(...a){args=a;return api},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}};return api}
 return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}},sqlite};
}
