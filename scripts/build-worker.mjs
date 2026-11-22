import {projectCatalog} from './project-catalog.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {readLogin} from './login-presentation.mjs';
import {expectedSchema} from './schema.mjs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
await build({entryPoints:['components/solar-models/entry.jsx'],bundle:true,minify:true,platform:'browser',format:'iife',target:['es2020'],define:{'process.env.NODE_ENV':'"production"'},outfile:'web/knowledge-models.bundle.js',legalComments:'eof'});
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-c','tailwind.knowledge.config.cjs','-i','components/solar-models/styles.css','-o','web/knowledge-models.css','--minify'],{stdio:'inherit'});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.csv':'text/csv; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const assets={};async function walk(dir,prefix=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),key=prefix+'/'+entry.name;if(entry.isDirectory())await walk(file,key);else{const type=types[path.extname(entry.name)];if(!type)throw Error('Unsupported public asset: '+key);assets[key]={type,body:gzipSync(await fs.readFile(file),{level:9}).toString('base64')}}}}
await walk('web');
// Bundle the existing server modules without rewriting import/export statements.
const server=await build({entryPoints:['worker/gate.mjs'],bundle:true,write:false,
 format:'iife',globalName:'AtlasGate',platform:'browser',target:'es2022'});
const gridBase=JSON.parse(await fs.readFile('web/energy/grid-checks.json','utf8'));
const {login,presentationCsp}=await readLogin();
const args=[assets,login,projectCatalog(),gridBase,presentationCsp].map(arg=>JSON.stringify(arg)).join(',');
const workerSource=sitesIdentity=>server.outputFiles[0].text+'\nexport default AtlasGate.createWorker('+args+','+
 JSON.stringify({schema:expectedSchema,sitesIdentity,standalone:!sitesIdentity})+');\n';
const output=workerSource(true);
await fs.mkdir('dist/cloudflare',{recursive:true});
await fs.writeFile('dist/cloudflare/worker.mjs',workerSource(false));
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});
await fs.writeFile('dist/server/index.js',output);await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built authenticated Worker:',Object.keys(assets).length,'protected assets;',gzipSync(output).length,'compressed bytes');
