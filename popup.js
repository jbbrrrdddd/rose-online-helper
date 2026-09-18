
const defaults={
  hpEnabled:true,hpThreshold:80,hpKey:'F1',hpCooldown:1000,
  sgEnabled:true,sgThreshold:30,sgKey:'F2',sgCooldown:1000,
  timedEnabled:false,timedKey:'F3',timedInterval:5000,
  gameTabId:null
};
const ids=['hpEnabled','hpThreshold','hpKey','hpCooldown',
           'sgEnabled','sgThreshold','sgKey','sgCooldown','timedEnabled','timedKey'];

for(const id of ['hpKey','sgKey','timedKey']){
  for(let i=1;i<=12;i++){
    const o=document.createElement('option'); o.value=o.textContent='F'+i;
    document.getElementById(id).appendChild(o);
  }
}
function save(){
  const v={};
  for(const id of ids){
    const e=document.getElementById(id);
    v[id]=e.type==='checkbox'?e.checked:(e.type==='number'?+e.value:e.value);
  }
  v.timedInterval=Math.max(200,+document.getElementById('timedIntervalSec').value*1000);
  chrome.storage.local.set(v);
}
for(const id of ids) document.getElementById(id).addEventListener('change',save);
document.getElementById('timedIntervalSec').addEventListener('change',save);

function setToggle(r){
  const b=document.getElementById('toggle');
  b.textContent=r?'STOP':'LOCK THIS TAB & START';
  b.style.background=r?'#ef4444':'#22c55e';
}
async function sendTo(id,msg){ try{return await chrome.tabs.sendMessage(id,msg)}catch{return null} }

async function ensureInjected(tabId){
  let s=await sendTo(tabId,{type:'status'});
  if(s) return s;
  try{
    await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
  }catch(e){
    return null;
  }
  await new Promise(r=>setTimeout(r,100));
  return await sendTo(tabId,{type:'status'});
}

document.getElementById('toggle').onclick=async()=>{
  const c=await chrome.storage.local.get({gameTabId:null});
  if(c.gameTabId){
    await sendTo(c.gameTabId,{type:'stop'});
    await chrome.storage.local.set({gameTabId:null});
    refresh(); return;
  }

  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab) return;

  const probe=await ensureInjected(tab.id);
  if(!probe){
    document.getElementById('status').textContent='Could not attach to this tab. Reload the game once and try again.';
    return;
  }
  if(probe.hp===null && probe.sg===null){
    document.getElementById('status').textContent='Attached, but HP/SG HUD was not found in this page.';
    return;
  }

  const r=await sendTo(tab.id,{type:'start'});
  if(r?.ok){
    await chrome.storage.local.set({gameTabId:tab.id});
    refresh();
  }
};

for(const b of document.querySelectorAll('[data-key]')){
  b.onclick=async()=>{
    const c=await chrome.storage.local.get({gameTabId:null});
    if(!c.gameTabId){document.getElementById('status').textContent='Start the game tab first.';return;}
    await sendTo(c.gameTabId,{type:'testKey',key:b.dataset.key});
  };
}

async function refresh(){
  const c=await chrome.storage.local.get({gameTabId:null});
  if(!c.gameTabId){
    setToggle(false);
    document.getElementById('status').textContent='STOPPED — open game tab and click LOCK THIS TAB & START';
    return;
  }
  const s=await sendTo(c.gameTabId,{type:'status'});
  if(!s){
    setToggle(false);
    document.getElementById('status').textContent='Game tab needs re-attachment — STOP then START again';
    return;
  }
  setToggle(!!s.running);
  document.getElementById('status').textContent=
    `GAME TAB LOCKED | HP: ${s.hp==null?'not found':s.hp.toFixed(1)+'%'} | `+
    `SG: ${s.sg==null?'not found':s.sg.toFixed(1)+'%'} | ${s.running?'RUNNING':'STOPPED'}`;
}

(async()=>{
  const c=await chrome.storage.local.get(defaults);
  for(const id of ids){
    const e=document.getElementById(id);
    e.type==='checkbox'?e.checked=!!c[id]:e.value=c[id];
  }
  document.getElementById('timedIntervalSec').value=c.timedInterval/1000;
  refresh();
})();
setInterval(refresh,750);
