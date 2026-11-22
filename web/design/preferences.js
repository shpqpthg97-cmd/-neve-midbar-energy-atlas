/* Local display preferences only. No authentication, data, or network behavior. */
(() => {
  'use strict';
  const key='nm-display-v1',root=document.documentElement;
  let stored={};try{stored=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
  const p={theme:['light','dark'].includes(stored.theme)?stored.theme:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),scale:[1,1.125,1.25,1.5,2].includes(stored.scale)?stored.scale:1,contrast:stored.contrast===true,links:stored.links===true};
  function apply(){root.dataset.theme=p.theme;root.dataset.contrast=p.contrast?'high':'normal';root.dataset.links=p.links?'highlight':'normal';root.style.setProperty('--text-scale',p.scale);document.dispatchEvent(new CustomEvent('display-preferences',{detail:{...p}}))}
  function save(next){Object.assign(p,next);try{localStorage.setItem(key,JSON.stringify(p))}catch{}apply()}
  window.NMDisplay={get:()=>({...p}),save,reset:()=>save({theme:p.theme,scale:1,contrast:false,links:false})};apply();
})();
