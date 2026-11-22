// D1-compatible SQLite adapter for development and tests, never included in the published Worker.
import{DatabaseSync}from'node:sqlite';import {migrateLocal} from './schema.mjs';
export function localDatabase(file=':memory:'){
 const sqlite=new DatabaseSync(file);
 try { migrateLocal(sqlite); } catch (error) { sqlite.close(); throw error; }
 function prepare(sql){let args=[];const api={bind(...a){args=a;return api},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}};return api}
 return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}},sqlite};
}
