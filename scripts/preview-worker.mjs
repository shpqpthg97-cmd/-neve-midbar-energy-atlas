// Invoked only by the managed Sites preview daemon, never used for publication.
import http from 'node:http';import fs from 'node:fs/promises';import {localDatabase} from './sqlite-preview.mjs';
const source=await fs.readFile('dist/server/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env=JSON.parse(await fs.readFile('.dev.vars','utf8'));await fs.mkdir('.preview',{recursive:true});env.DB=localDatabase('.preview/auth.db');
http.createServer(async(req,res)=>{try{const origin='http://'+req.headers.host;const body=['GET','HEAD'].includes(req.method)?undefined:req;const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(body?{body,duplex:'half'}:{})});const response=await worker.fetch(request,{...env,ATLAS_ORIGIN:origin});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500);res.end('Preview error')}}).listen(Number(process.env.PORT||4173),'0.0.0.0');
