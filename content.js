if (!window.__GAME_AUTO_HELPER_V21__) {
window.__GAME_AUTO_HELPER_V21__ = true;

const DEFAULTS = {
  hpEnabled:true, hpThreshold:80, hpKey:'F1', hpCooldown:1000,
  sgEnabled:true, sgThreshold:30, sgKey:'F2', sgCooldown:1000,
  timedEnabled:false, timedKey:'F3', timedInterval:5000
};

let cfg={...DEFAULTS};
let running=false;
let lastHP=0, lastSG=0, lastTimed=0;
let hpObserver=null, sgObserver=null, rootObserver=null;
let timer=null;

function keyCodeFor(key){
  const m=/^F([1-9]|1[0-2])$/.exec(key);
  return m ? 111 + Number(m[1]) : 0;
}

function dispatchGameKey(key){
  // IMPORTANT: events are dispatched only into THIS tab's DOM.
  // No OS-level/global key injection is used.
  const keyCode=keyCodeFor(key);
  const targets=[
    document.activeElement,
    document.querySelector('canvas'),
    document.body,
    document.documentElement,
    document,
    window
  ].filter(Boolean);

  const opts={
    key, code:key, keyCode, which:keyCode,
    bubbles:true, cancelable:true, composed:true
  };

  // Use the first sensible DOM target and allow bubbling to document/window.
  const target=targets[0] || document;
  target.dispatchEvent(new KeyboardEvent('keydown',opts));
  target.dispatchEvent(new KeyboardEvent('keypress',opts));
  target.dispatchEvent(new KeyboardEvent('keyup',opts));
}

function percentFromWidth(el){
  const n=parseFloat(el?.style?.width||'');
  return Number.isFinite(n)?n:null;
}

function readHP(){
  const root=document.querySelector('.progressbar.health.percent');
  if(!root) return null;
  const pct=parseFloat(root.querySelector('.label.percent')?.textContent||'');
  if(Number.isFinite(pct)) return pct;
  return percentFromWidth(root.querySelector('.bar'));
}

function readSG(){
  const root=document.querySelector('.progressbar.summon');
  if(!root) return null;
  const text=root.querySelector('.label.absolute')?.textContent||'';
  const m=text.match(/([\d.]+)\s*\/\s*([\d.]+)/);
  if(m && +m[2]>0) return (+m[1]/+m[2])*100;
  return percentFromWidth(root.querySelector('.bar'));
}

function checkHP(){
  if(!running || !cfg.hpEnabled) return;
  const hp=readHP(), now=Date.now();
  if(hp!==null && hp < +cfg.hpThreshold && now-lastHP >= +cfg.hpCooldown){
    dispatchGameKey(cfg.hpKey);
    lastHP=now;
  }
}

function checkSG(){
  if(!running || !cfg.sgEnabled) return;
  const sg=readSG(), now=Date.now();
  if(sg!==null && sg < +cfg.sgThreshold && now-lastSG >= +cfg.sgCooldown){
    dispatchGameKey(cfg.sgKey);
    lastSG=now;
  }
}

function attachObservers(){
  hpObserver?.disconnect(); sgObserver?.disconnect(); rootObserver?.disconnect();

  const hp=document.querySelector('.progressbar.health.percent');
  const sg=document.querySelector('.progressbar.summon');

  if(hp){
    hpObserver=new MutationObserver(checkHP);
    hpObserver.observe(hp,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
  }
  if(sg){
    sgObserver=new MutationObserver(checkSG);
    sgObserver.observe(sg,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
  }

  // If the game rebuilds/replaces its HUD, automatically re-bind.
  rootObserver=new MutationObserver(()=>{
    const newHp=document.querySelector('.progressbar.health.percent');
    const newSg=document.querySelector('.progressbar.summon');
    if((hp && newHp!==hp) || (!hp && newHp) || (sg && newSg!==sg) || (!sg && newSg)){
      attachObservers();
    }
  });
  rootObserver.observe(document.documentElement,{subtree:true,childList:true});
}

function scheduleTimer(){
  clearTimeout(timer);
  if(!running) return;
  const interval=Math.max(200,+cfg.timedInterval||5000);
  const due=Math.max(50, interval-(Date.now()-lastTimed));
  timer=setTimeout(()=>{
    if(running && cfg.timedEnabled){
      dispatchGameKey(cfg.timedKey);
      lastTimed=Date.now();
    }
    // Also serves as a low-frequency fallback if a game update did not mutate
    // the exact nodes we observed.
    checkHP();
    checkSG();
    scheduleTimer();
  }, due);
}

function start(){
  running=true;
  lastHP=0; lastSG=0; lastTimed=Date.now();
  attachObservers();
  checkHP(); checkSG();
  scheduleTimer();
}

function stop(){
  running=false;
  clearTimeout(timer); timer=null;
  hpObserver?.disconnect(); sgObserver?.disconnect(); rootObserver?.disconnect();
}

chrome.storage.local.get(DEFAULTS,x=>{
  for(const k of Object.keys(DEFAULTS)) if(x[k]!==undefined) cfg[k]=x[k];
});

chrome.storage.onChanged.addListener(ch=>{
  for(const [k,v] of Object.entries(ch)) if(k in DEFAULTS) cfg[k]=v.newValue;
  if(running) scheduleTimer();
});

chrome.runtime.onMessage.addListener((msg,_,send)=>{
  if(msg.type==='start'){
    start();
    send({ok:true,hp:readHP(),sg:readSG(),running});
    return;
  }
  if(msg.type==='stop'){
    stop();
    send({ok:true,running});
    return;
  }
  if(msg.type==='status'){
    send({hp:readHP(),sg:readSG(),running});
    return;
  }
  if(msg.type==='testKey'){
    dispatchGameKey(msg.key);
    send({ok:true});
  }
});

}
