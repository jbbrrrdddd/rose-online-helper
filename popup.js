
const DEFAULTS={
  hpEnabled:true,hpThreshold:80,hpKey:'F1',hpCooldown:1000,
  sgEnabled:true,sgThreshold:30,sgKey:'F2',sgCooldown:1000,
  timedEnabled:false,timedKey:'F3',timedInterval:5000
};
const ids=['hpEnabled','hpThreshold','hpKey','hpCooldown','sgEnabled','sgThreshold',
           'sgKey','sgCooldown','timedEnabled','timedKey'];

for(const id of ['hpKey','sgKey','timedKey']){
  for(let i=1;i<=12;i++){
    const o=document.createElement('option'); o.value=o.textContent='F'+i;
    document.getElementById(id).appendChild(o);
  }
}

async function activeTab(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  return tab;
}
function storageKey(tabId){ return `tabConfig_${tabId}`; }

function formConfig(){
  const v={};
  for(const id of ids){
    const e=document.getElementById(id);
    v[id]=e.type==='checkbox'?e.checked:(e.type==='number'?+e.value:e.value);
  }
  v.timedInterval=Math.max(200,+document.getElementById('timedIntervalSec').value*1000);
  return v;
}
function fillForm(c){
  c={...DEFAULTS,...c};
  for(const id of ids){
    const e=document.getElementById(id);
    e.type==='checkbox'?e.checked=!!c[id]:e.value=c[id];
  }
  document.getElementById('timedIntervalSec').value=c.timedInterval/1000;
}
async function send(tabId,msg){
  try{return await chrome.tabs.sendMessage(tabId,msg)}catch{return null}
}
async function ensureInjected(tabId){
  let s=await send(tabId,{type:'status'});
  if(s) return s;
  try{ await chrome.scripting.executeScript({target:{tabId},files:['content.js']}); }
  catch(e){ return null; }
  await new Promise(r=>setTimeout(r,100));
  return await send(tabId,{type:'status'});
}
function setButton(running){
  const b=document.getElementById('toggle');
  b.textContent=running?'STOP THIS TAB':'START THIS TAB';
  b.style.background=running?'#ef4444':'#22c55e';
}

async function saveForThisTab(){
  const tab=await activeTab(); if(!tab) return;
  const cfg=formConfig();
  await chrome.storage.local.set({[storageKey(tab.id)]:cfg});
  const s=await send(tab.id,{type:'status'});
  if(s?.running) await send(tab.id,{type:'updateConfig',config:cfg});
}

for(const id of ids) document.getElementById(id).addEventListener('change',saveForThisTab);
document.getElementById('timedIntervalSec').addEventListener('change',saveForThisTab);

document.getElementById('toggle').onclick=async()=>{
  const tab=await activeTab(); if(!tab) return;
  let s=await ensureInjected(tab.id);
  if(!s){
    document.getElementById('status').textContent='Could not attach to this tab. Reload the game and try again.';
    return;
  }
  if(s.running){
    await send(tab.id,{type:'stop'});
    await refresh();
    return;
  }
  if(s.hp===null && s.sg===null){
    document.getElementById('status').textContent='Attached, but HP/SG HUD was not found in THIS tab.';
    return;
  }
  const cfg=formConfig();
  await chrome.storage.local.set({[storageKey(tab.id)]:cfg});
  await send(tab.id,{type:'start',config:cfg});
  await refresh();
};

for(const b of document.querySelectorAll('[data-key]')){
  b.onclick=async()=>{
    const tab=await activeTab(); if(!tab) return;
    const s=await ensureInjected(tab.id);
    if(!s){ document.getElementById('status').textContent='Could not attach to this tab.'; return; }
    await send(tab.id,{type:'testKey',key:b.dataset.key});
  };
}

async function refresh(){
  const tab=await activeTab();
  if(!tab) return;
  const stored=await chrome.storage.local.get(storageKey(tab.id));
  const saved=stored[storageKey(tab.id)] || DEFAULTS;
  const s=await send(tab.id,{type:'status'});
  if(!s){
    setButton(false);
    document.getElementById('status').textContent='THIS TAB: not started';
    return;
  }
  setButton(!!s.running);
  if(s.stoppedByZoneChange){
    document.getElementById('status').textContent=
      `AUTO-STOPPED: map changed from ${s.startZone||'?'} to ${s.zone||'?'}`;
  }else{
    document.getElementById('status').textContent=
      `THIS TAB | MAP: ${s.zone||'not found'} | HP: ${s.hp==null?'not found':s.hp.toFixed(1)+'%'} | `+
      `SG: ${s.sg==null?'not found':s.sg.toFixed(1)+'%'} | ${s.running?'RUNNING':'STOPPED'}`;
  }
}

(async()=>{
  const tab=await activeTab();
  if(!tab) return;
  const stored=await chrome.storage.local.get(storageKey(tab.id));
  fillForm(stored[storageKey(tab.id)] || DEFAULTS);
  await refresh();
})();
