// v9 Full — day/night sprites, finger-drag, parallax, fog, glow, neon logo, audio playlist
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const livesEl = document.getElementById('lives');
const startOverlay = document.getElementById('startOverlay');
const messageOverlay = document.getElementById('messageOverlay');
const msgTitle = document.getElementById('msgTitle');
const msgText = document.getElementById('msgText');
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnPlay = document.getElementById('btnPlay');
const diffSelect = document.getElementById('difficulty');
const slowBadge = document.getElementById('slowBadge');
const fastBadge = document.getElementById('fastBadge');
const pausedBadge = document.getElementById('pausedBadge');
const btnVol = document.getElementById('btnVol');
const bgm = document.getElementById('bgm');
const stageWrap = document.getElementById('stageWrap');

let W = canvas.width, H = canvas.height;
const TARGET_PUMPKINS = 100;
const BASE_LIVES = 3;

const player = { w: 180, h: 26, x: (W-180)/2, y: H-36, vx:0 };
let pumpkins = 0, lives = BASE_LIVES;
let objects = [];
let lastSpawn = 0, spawnInterval = 720;
let running = false, paused = false;
let lastTime = 0, startTime = 0, elapsedMs = 0;
let diff = 'normal';
let pumpkinSpeedFactor = 1, slowUntil = 0, fastUntil = 0;

// day/night by local time
let NIGHT_MODE = false;
(function decideMode(){
  try { const h = new Date().getHours(); NIGHT_MODE = (h >= 20 || h < 6); } catch(e){ NIGHT_MODE = false; }
})();

function rand(a,b){return Math.random()*(b-a)+a}
function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

const TYPES = { PUMPKIN:'pumpkin', SPIDER:'spider', CANDY:'candy', GHOST:'ghost', WEB:'web' };
const baseFall = { pumpkin:2.2, spider:2.6, candy:2.0, ghost:2.0, web:2.2 };
const DIFF = {
  easy:   { spawnBase: 820, spawnMin: 420, fallMul: 0.9, bag: [ 'P','P','P','P','P', 'S','S', 'C', 'G','G', 'W' ] },
  normal: { spawnBase: 720, spawnMin: 360, fallMul: 1.0, bag: [ 'P','P','P','P',    'S','S', 'C', 'G','G', 'W' ] },
  hard:   { spawnBase: 600, spawnMin: 300, fallMul: 1.2, bag: [ 'P','P','P',        'S','S','S', 'C', 'G', 'W','W' ] },
  expert: { spawnBase: 520, spawnMin: 260, fallMul: 1.35,bag: [ 'P','P','P',        'S','S','S', 'C', 'G', 'W','W' ] }
};
function bagToTypes(bag){ return bag.map(c => c==='P'?'pumpkin': c==='S'?'spider': c==='C'?'candy': c==='G'?'ghost':'web'); }

// Parallax based on player.x
function parallaxUpdate(){
  const pct = player.x / Math.max(1, (canvas.width - player.w));
  const xShift = -10 + pct * 20; // -10%..+10%
  stageWrap.style.backgroundPosition = `${50 + xShift}% center`;
}

// Fog setup
const fog = [];
for(let i=0;i<26;i++){
  fog.push({ x: Math.random(), y: Math.random(), r: 0.06 + Math.random()*0.12, a: 0.06 + Math.random()*0.08, vx: (Math.random()*0.0006 - 0.0003), vy: (Math.random()*0.0004 - 0.0002) });
}

// Palette (used for vector fallback)
const PAL = {
  pumpkinBody: '#e56c05', pumpkinRib:'#bf5600', pumpkinStem:'#4a8f3c',
  basketBody:'#2a2c5f', basketGlow:'rgba(255,209,90,0.55)',
  spiderBody:'#1a1a1a', spiderLeg:'#2a2a2a',
  webStroke:'#c7d8ff', candyMain:'#f64dcc', candyStripe:'#ffe4f8',
  ghostBody:'#e7f0ff', ghostFace:'#cfdcf5'
};

// Vector sprites (fallback)
function drawPumpkinVec(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.shadowColor='rgba(255,140,30,0.35)';ctx.shadowBlur=12;ctx.fillStyle=PAL.pumpkinBody;rounded(0,0,26,22,8);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=PAL.pumpkinRib;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,3);ctx.quadraticCurveTo(13,11,5,19);ctx.stroke();ctx.beginPath();ctx.moveTo(21,3);ctx.quadraticCurveTo(13,11,21,19);ctx.stroke();ctx.fillStyle=PAL.pumpkinStem;rounded(11,-5,6,7,2);ctx.fill();ctx.restore()}
function drawSpiderVec(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=PAL.spiderBody;circle(13,12,8);ctx.fillStyle='#0b0b0b';circle(9,12,5);ctx.strokeStyle=PAL.spiderLeg;ctx.lineWidth=2;[[3,10,0,6],[3,14,0,18],[23,10,26,6],[23,14,26,18]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()});ctx.restore()}
function drawCandyVec(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.shadowColor='rgba(255,130,230,0.45)';ctx.shadowBlur=10;ctx.fillStyle=PAL.candyMain;rounded(0,6,22,10,5);ctx.fill();ctx.beginPath();ctx.moveTo(-4,11);ctx.lineTo(0,6);ctx.lineTo(0,16);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(26,11);ctx.lineTo(22,6);ctx.lineTo(22,16);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=PAL.candyStripe;rounded(6,8,10,6,3);ctx.fill();ctx.restore()}
function drawGhostVec(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=PAL.ghostBody;rounded(0,0,22,22,10);ctx.fill();ctx.fillRect(0,16,22,6);ctx.fillStyle=PAL.ghostFace;circle(8,9,2.2);circle(14,9,2.2);ctx.restore()}
function drawWebVec(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.strokeStyle=PAL.webStroke;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(24,24);ctx.moveTo(24,0);ctx.lineTo(0,24);ctx.stroke();ctx.beginPath();ctx.arc(12,12,10,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(12,12,6,0,Math.PI*2);ctx.stroke();ctx.restore()}

// Sprite loader (day/night, webp) with fallback
const SPRITES = {pumpkin:null, spider:null, candy:null, ghost:null, web:null};
function loadSprite(name, cb){
  const folder = NIGHT_MODE ? 'assets/night' : 'assets/day';
  const img = new Image();
  img.onload = ()=>cb(img);
  img.onerror = ()=>cb(null);
  img.src = `${folder}/${name}.webp`;
}
['pumpkin','spider','candy','ghost','web'].forEach(n=>loadSprite(n, img=>SPRITES[n]=img));

let drawPumpkin = drawPumpkinVec, drawSpider = drawSpiderVec, drawCandy = drawCandyVec, drawGhost = drawGhostVec, drawWeb = drawWebVec;
const _dP = drawPumpkin, _dS = drawSpider, _dC = drawCandy, _dG = drawGhost, _dW = drawWeb;
drawPumpkin = (x,y,s=1)=>{ if(SPRITES.pumpkin){ const size=26*s; const t=performance.now(); const k=0.5+0.5*Math.sin(t*0.004); ctx.save(); ctx.globalAlpha=0.35*k; ctx.fillStyle='rgba(255,150,40,1)'; ctx.beginPath(); ctx.arc(x+size/2,y+size/2+2,size*0.6,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.drawImage(SPRITES.pumpkin,x,y,size,size);} else _dP(x,y,s); };
drawSpider  = (x,y,s=1)=>{ if(SPRITES.spider){ const size=26*s; ctx.drawImage(SPRITES.spider,x,y,size,size);} else _dS(x,y,s); };
drawCandy   = (x,y,s=1)=>{ if(SPRITES.candy){ const size=26*s; ctx.drawImage(SPRITES.candy,x,y,size,size);} else _dC(x,y,s); };
drawGhost   = (x,y,s=1)=>{ if(SPRITES.ghost){ const size=26*s; ctx.drawImage(SPRITES.ghost,x,y,size,size);} else _dG(x,y,s); };
drawWeb     = (x,y,s=1)=>{ if(SPRITES.web){ const size=26*s; ctx.drawImage(SPRITES.web,x,y,size,size);} else _dW(x,y,s); };

// HUD helpers
function updateScore(){ scoreEl.textContent = `🎃 ${pumpkins} / ${TARGET_PUMPKINS}` }
function updateLives(){ livesEl.textContent = '❤️'.repeat(lives) + '🤍'.repeat(Math.max(0, BASE_LIVES - lives)) }

// Pointer (finger) control
let dragging=false;
canvas.addEventListener('pointerdown', (e)=>{ dragging=true; follow(e) });
window.addEventListener('pointerup', ()=> dragging=false);
window.addEventListener('pointercancel', ()=> dragging=false);
canvas.addEventListener('pointermove', (e)=>{ if(dragging) follow(e) });
function follow(e){
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width/r.width);
  player.x = Math.max(0, Math.min(canvas.width - player.w, x - player.w/2));
  player.vx = 0;
  parallaxUpdate();
}

// BGM unlock + playlist (local-first)
async function unlockAudio(){ try{ await bgm.play(); }catch(e){} }
['pointerdown','click','touchstart','keydown'].forEach(ev=>window.addEventListener(ev, unlockAudio, { once:true, passive:true }));

(function setupAudioPlaylist(){
  if (!bgm) return;
  const sources = [
    { local: 'assets/audio/horroriffic.mp3', remote: 'https://freepd.com/music/Horroriffic.mp3' },
    { local: 'assets/audio/ghostpocalypse.mp3', remote: 'https://freepd.com/music/Ghostpocalypse.mp3' },
    { local: 'assets/audio/come_play_with_me.mp3', remote: 'https://freepd.com/music/Come%20Play%20With%20Me.mp3' },
    { local: 'assets/audio/night_of_chaos.mp3', remote: 'https://freepd.com/music/Night%20of%20Chaos.mp3' }
  ];
  let current = Math.floor(Math.random() * sources.length);
  function setTrack(idx){
    current = (idx + sources.length) % sources.length;
    const src = sources[current];
    bgm.src = src.local;
    const onError = () => { bgm.removeEventListener('error', onError); bgm.src = src.remote; };
    bgm.addEventListener('error', onError, { once:true });
  }
  setTrack(current);
  bgm.loop = false;
  bgm.addEventListener('ended', ()=> setTrack(current+1));
  function setVolIcon(){ btnVol.textContent = bgm.muted ? '🔇' : '🔊'; }
  btnVol.addEventListener('click', ()=>{ bgm.muted = !bgm.muted; setVolIcon(); });
  setVolIcon();
})();

btnPlay.addEventListener('click', ()=>{ if(!running) return; paused = !paused; pausedBadge.classList.toggle('hidden', !paused); if(!paused) requestAnimationFrame(loop) });
btnStart.addEventListener('click', ()=> startGame(diffSelect.value));
btnRestart.addEventListener('click', ()=> startGame(diff));

// Spawning/physics
function spawn(now){
  if(now - lastSpawn < spawnInterval) return;
  lastSpawn = now;
  const profile = DIFF[diff];
  const bag = bagToTypes(profile.bag);
  const type = bag[(Math.random()*bag.length)|0];
  const size = (type==='pumpkin')?44:(type==='spider')?36:(type==='candy')?30:(type==='web')?34:32;
  let vy = (baseFall[type] + (Math.random()*1.0 - 0.4)) * profile.fallMul;
  objects.push({ type, x: rand(20, W-20), y: -40, vy, size });
  spawnInterval = Math.max(profile.spawnMin, profile.spawnBase - pumpkins*2.4);
}
function collides(o){
  const bx = player.x, by = player.y, bw = player.w, bh = player.h;
  const r = o.size*0.5;
  const cx = Math.max(bx, Math.min(o.x, bx+bw));
  const cy = Math.max(by, Math.min(o.y, by+bh));
  const dx = o.x - cx, dy = o.y - cy;
  return (dx*dx+dy*dy) <= r*r;
}
function applyCatch(o, now){
  if(o.type==='pumpkin'){ pumpkins=Math.min(TARGET_PUMPKINS,pumpkins+1); updateScore(); }
  else if(o.type==='spider'){ pumpkins=Math.max(0,pumpkins-1); lives=Math.max(0,lives-1); updateScore(); updateLives(); }
  else if(o.type==='candy'){ slowUntil = now + 6000; }
  else if(o.type==='web'){ fastUntil = now + 6000; lives=Math.max(0,lives-1); updateLives(); }
  if(pumpkins>=TARGET_PUMPKINS) win(now);
  if(lives<=0) lose();
}
function update(dt, now){
  elapsedMs = now - startTime; timerEl.textContent = `⏱ ${(elapsedMs/1000).toFixed(1)}s`;
  pumpkinSpeedFactor = 1; if(now<slowUntil) pumpkinSpeedFactor*=0.6; if(now<fastUntil) pumpkinSpeedFactor*=2.0;
  slowBadge.classList.toggle('hidden', !(now<slowUntil));
  fastBadge.classList.toggle('hidden', !(now<fastUntil));
  objects = objects.filter(o=>{
    const mult = (o.type==='pumpkin')?pumpkinSpeedFactor:1;
    o.y += o.vy * mult * dt * 0.06;
    if(collides(o)){ applyCatch(o, now); return false; }
    return o.y <= H + 60;
  });
}

// Draw
function drawBackground(){
  // fog
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(const f of fog){
    const fx=f.x*W, fy=f.y*H, fr=f.r*Math.min(W,H);
    const g = ctx.createRadialGradient(fx,fy,fr*0.2, fx,fy,fr);
    g.addColorStop(0, 'rgba(180,200,255,0.07)');
    g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(fx,fy,fr,0,Math.PI*2); ctx.fill();
    f.x+=f.vx; f.y+=f.vy; if(f.x<-0.1) f.x=1.1; if(f.x>1.1) f.x=-0.1; if(f.y<-0.1) f.y=1.1; if(f.y>1.1) f.y=-0.1;
  }
  ctx.restore();
}
function drawPlayer(){
  const {x,y,w,h}=player;
  ctx.save();
  ctx.shadowColor = 'rgba(130,60,220,0.5)'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#2a2c5f'; rounded(x,y,w,h,10); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd15a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+16,y); ctx.bezierCurveTo(x+22,y-10,x+w-22,y-10,x+w-16,y); ctx.stroke();
  const label='ОНЛАЙНТРЕЙД.РУ'; ctx.font='bold 13px system-ui,Arial'; ctx.textAlign='center'; const tx=x+w/2, ty=y+h/2+4;
  ctx.save(); ctx.strokeStyle='rgba(130,60,220,0.7)'; ctx.lineWidth=6; ctx.strokeText(label,tx,ty); ctx.restore();
  ctx.fillStyle='#ff9a3a'; ctx.fillText(label,tx,ty);
  ctx.restore();
}
function drawObjects(){
  for(const o of objects){
    ctx.save(); ctx.translate(o.x - o.size/2, o.y - o.size/2);
    const sc = o.size/26;
    if(o.type==='pumpkin') drawPumpkin(0,0,sc);
    else if(o.type==='spider') drawSpider(0,0,sc);
    else if(o.type==='candy') drawCandy(0,0,sc);
    else if(o.type==='ghost') drawGhost(0,0,sc);
    else if(o.type==='web') drawWeb(0,0,sc);
    ctx.restore();
  }
}

// Vignette overlay
function vignette(){
  ctx.save();
  const grad = ctx.createRadialGradient(W/2, H*0.6, Math.min(W,H)*0.2, W/2, H/2, Math.max(W,H)*0.75);
  const edge = NIGHT_MODE ? 0.6 : 0.45;
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${edge})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

// Loop
function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(32, ts - lastTime);
  lastTime = ts;
  spawn(ts); update(dt, ts);
  ctx.clearRect(0,0,W,H);
  drawBackground(); drawObjects(); drawPlayer(); vignette();
  if(running && !paused) requestAnimationFrame(loop);
}
function startGame(difficulty){
  diff = difficulty || 'normal';
  pumpkins=0; lives=BASE_LIVES; updateScore(); updateLives();
  objects.length=0; lastSpawn=0; spawnInterval = DIFF[diff].spawnBase;
  running=true; paused=false; lastTime=0; startTime=performance.now(); timerEl.textContent='⏱ 0.0s';
  startOverlay.classList.add('hidden'); messageOverlay.classList.add('hidden');
  requestAnimationFrame(loop);
}
function win(now){
  running=false;
  msgTitle.textContent='Победа!'; msgText.textContent=`Ты собрал 100 тыкв за ${((now-startTime)/1000).toFixed(2)}s!`;
  messageOverlay.classList.remove('hidden');
}
function lose(){
  running=false;
  msgTitle.textContent='Игра окончена'; msgText.textContent='Жизни закончились. Попробуй ещё раз!';
  messageOverlay.classList.remove('hidden');
}

// Init
function init(){ W=canvas.width; H=canvas.height; updateScore(); timerEl.textContent='⏱ 0.0s'; updateLives(); }
init();


// === v9.2 URL params: ?mode=night|day & ?lang=ru|en ===
const URL_PARAMS = new URLSearchParams(location.search);
const MODE_PARAM = (URL_PARAMS.get('mode')||'').toLowerCase();
const LANG_PARAM = (URL_PARAMS.get('lang')||'').toLowerCase();

if (MODE_PARAM==='night') NIGHT_MODE = true;
if (MODE_PARAM==='day') NIGHT_MODE = false;

// Simple i18n
const I18N = {
  ru: {
    title: '🎃 Pumpkin Catcher',
    intro: 'Веди корзину пальцем по экрану. Собери 100 🎃. Избегай 🕷 и 🕸. 🍬 замедляет, 🕸 ускоряет.',
    play: 'Играть',
    win: 'Победа!',
    winText: (s)=>`Ты собрал 100 тыкв за ${s}s!`,
    lose: 'Игра окончена',
    loseText: 'Жизни закончились. Попробуй ещё раз!'
  },
  en: {
    title: '🎃 Pumpkin Catcher',
    intro: 'Drag the basket with your finger. Collect 100 🎃. Avoid 🕷 and 🕸. 🍬 slows, 🕸 speeds up.',
    play: 'Play',
    win: 'You win!',
    winText: (s)=>`You collected 100 pumpkins in ${s}s!`,
    lose: 'Game Over',
    loseText: 'No lives left. Try again!'
  }
};
const LANG = (LANG_PARAM==='en') ? 'en' : 'ru';

(function applyLang(){
  const t = I18N[LANG];
  const h1 = document.querySelector('#startOverlay h1');
  const p  = document.querySelector('#startOverlay p');
  if (h1) h1.textContent = t.title;
  if (p) p.textContent = t.intro;
  if (btnStart) btnStart.textContent = t.play;
  function applyMsg(win, seconds){
    msgTitle.textContent = win ? t.win : t.lose;
    msgText.textContent  = win ? t.winText(seconds) : t.loseText;
  }
  // wrap originals
  const _win = win, _lose = lose;
  win = function(now){
    running=false;
    const seconds = ((now-startTime)/1000).toFixed(2);
    applyMsg(true, seconds);
    messageOverlay.classList.remove('hidden');
  };
  lose = function(){
    running=false;
    applyMsg(false);
    messageOverlay.classList.remove('hidden');
  };
})();


// === v9.3 additions: auto-lang, UTM capture, preloader ===

// Auto language detection when no ?lang is provided:
if (!LANG_PARAM){
  try {
    const nlang = (navigator.language || '').toLowerCase();
    if (nlang.startsWith('en')) { 
      // switch to EN only if not explicitly RU param
      (function switchToEN(){
        const t = I18N['en'];
        const h1 = document.querySelector('#startOverlay h1');
        const p  = document.querySelector('#startOverlay p');
        if (h1) h1.textContent = t.title;
        if (p) p.textContent = t.intro;
        if (btnStart) btnStart.textContent = t.play;
        // override win/lose handlers
        const _win = win, _lose = lose;
        win = function(now){ running=false; const seconds=((now-startTime)/1000).toFixed(2); msgTitle.textContent=t.win; msgText.textContent=t.winText(seconds); messageOverlay.classList.remove('hidden'); };
        lose = function(){ running=false; msgTitle.textContent=t.lose; msgText.textContent=t.loseText; messageOverlay.classList.remove('hidden'); };
      })();
    }
  } catch(e){ /* ignore */ }
}

// UTM capture → localStorage (for simple analytics / later use in bot deeplinks)
(function captureUTM(){
  const p = new URLSearchParams(location.search);
  const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  let any=false, data={ ts: Date.now() };
  keys.forEach(k=>{ const v=p.get(k); if(v){ any=true; data[k]=v; } });
  if(any){
    try { localStorage.setItem('halloween_utm', JSON.stringify(data)); } catch(e){}
  }
})();

// Preloader for sprite assets
(function setupPreloader(){
  const pre = document.getElementById('preloader');
  const plText = document.getElementById('plText');
  if(!pre) return;
  const total = 5; // pumpkin, spider, candy, ghost, web
  let loaded = 0;
  function setPct(){ if(plText) plText.textContent = Math.round(loaded/total*100)+'%'; }
  function done(){ pre.classList.add('hidden'); }
  function onOne(){ loaded++; setPct(); if(loaded>=total) done(); }

  // If sprites already loaded, consider them complete; otherwise attach listeners
  [['pumpkin',SPRITES.pumpkin],['spider',SPRITES.spider],['candy',SPRITES.candy],['ghost',SPRITES.ghost],['web',SPRITES.web]].forEach(([name, img])=>{
    if(img && img.complete) onOne();
    else if(img){ img.addEventListener('load', onOne, { once:true }); img.addEventListener('error', onOne, { once:true }); }
    else {
      // image not created yet -> create one-time proxy loader
      const folder = NIGHT_MODE ? 'assets/night' : 'assets/day';
      const aux = new Image();
      aux.onload = onOne; aux.onerror = onOne; aux.src = `${folder}/${name}.webp`;
    }
  });

  // Failsafe timeout (hide after 2.5s even if not complete)
  setPct();
  setTimeout(done, 2500);
})();
