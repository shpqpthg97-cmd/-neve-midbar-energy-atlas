import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function readLogin() {
const loginStyles=(await Promise.all(['fonts','tokens','components','login'].map(name=>fs.readFile('web/design/'+name+'.css','utf8')))).join('\n');
const loginScript=(await Promise.all(['preferences','icons','common','login'].map(name=>fs.readFile('web/design/'+name+'.js','utf8')))).join('\n');
const login=(await fs.readFile('worker/login.html','utf8')).replace('<!--DESIGN_STYLES-->','<style>'+loginStyles+'</style>').replace('<!--DESIGN_SCRIPTS-->','<script>'+loginScript+'</script>');
const presentationCsp="'sha256-"+createHash('sha256').update(loginScript).digest('base64')+"'";
return {login,presentationCsp};
}
