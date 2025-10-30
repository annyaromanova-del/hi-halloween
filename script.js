// v11 — Basket Sprite Support + Hitbox Align + Audio Fallbacks (+ Responsive + Parallax)

// --- robust preloader hide ---
(function(){
  function hidePreloader(){
    const p = document.getElementById('preloader');
    if (p && !p.classList.contains('hidden')) p.classList.add('hidden');
  }
  window.addEventListener('load', hidePreloader, { once:true });
  ['pointerdown','touchstart','click','keydown'].forEach(ev=>{
    window.addEventListener(ev, hidePreloader, { once:true, passive:true });
  });
  setTimeout(hidePreloader, 2500);
})();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageEl = document.getElementById('stageWrap');

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const livesEl = document.getElementById('lives');
const startOverlay = document.getElementById('startOverlay');
const messageOverlay = document.getElementById('messageOverlay');
const msgTitle = document.getElementById('msgTitle');
const msgText = document.getElementById('msgText');
const btnMenu = document.getElementById('btnMenu');
const btnRestart = document.getElementById('btnRestart');
const btnPlay = document.getElementById('btnPlay');
const diffSelect = document.getElementById('difficulty');
const slowBadge = document.getElementById('slowBadge');
const fastBadge = document.getElementById('fastBadge');
const quakeBadge = document.getElementById('quakeBadge');
const pausedBadge = document.getElementById('pausedBadge');
const winActions = document.getElementById('winActions');
const lossActions = document.getElementById('lossActions');
const btnVol = document.getElementById('btnVol');
const bgm = document.getElementById('bgm');
const introOverlay = document.getElementById('introOverlay');
const introVideo = document.getElementById('introVideo');
const introSkip = document.getElementById('introSkip');
const introPlay = document.getElementById('introPlay');

let introFinished = !introOverlay;
let introPlayRequested = false;
try { if (typeof window !== 'undefined') window.__introFinished = introFinished; }catch(_){ }

function dispatchIntroFinished(){
  try {
    document.dispatchEvent(new CustomEvent('introFinished'));
  } catch (_) {
    try { document.dispatchEvent(new Event('introFinished')); } catch (_) {}
  }
}

function finishIntro(){
  if (introFinished) return;
  introFinished = true;
  try { if (typeof window !== 'undefined') window.__introFinished = true; }catch(_){ }
  if (introOverlay){
    introOverlay.classList.add('hidden');
    introOverlay.classList.remove('intro-paused');
  }
  if (introVideo){
    try{ introVideo.pause(); }catch(_){ }
  }
  dispatchIntroFinished();
}

function requestIntroPlayback(){
  if (introFinished) return;
  if (!introVideo){
    finishIntro();
    return;
  }
  if (!introVideo.src){
    finishIntro();
    return;
  }
  if (introPlayRequested && !introVideo.paused) return;
  introOverlay?.classList.remove('intro-paused');
  introPlayRequested = true;
  const attempt = introVideo.play();
  if (attempt && typeof attempt.then === 'function'){
    attempt.then(()=>{
      introOverlay?.classList.remove('intro-paused');
    }).catch(()=>{
      introPlayRequested = false;
      introOverlay?.classList.add('intro-paused');
    });
  }
}

if (introOverlay){
  introOverlay.classList.remove('hidden');
  introOverlay.classList.remove('intro-paused');
  introVideo?.addEventListener('ended', ()=>{ finishIntro(); });
  introVideo?.addEventListener('error', ()=>{ finishIntro(); });
  introVideo?.addEventListener('playing', ()=>{ introOverlay?.classList.remove('intro-paused'); });
  introVideo?.addEventListener('play', ()=>{ introOverlay?.classList.remove('intro-paused'); });
  introVideo?.addEventListener('pause', ()=>{
    if (!introFinished){
      introOverlay?.classList.add('intro-paused');
      introPlayRequested = false;
    }
  });
  introVideo?.addEventListener('loadeddata', ()=>{ requestIntroPlayback(); });
  introVideo?.addEventListener('canplay', ()=>{ requestIntroPlayback(); });
  introVideo?.addEventListener('click', e=>{
    if (!introFinished && introVideo.paused){
      e.preventDefault();
      e.stopPropagation();
      requestIntroPlayback();
    }
  });
  introSkip?.addEventListener('click', e=>{
    e.preventDefault();
    e.stopPropagation();
    finishIntro();
  });
  introPlay?.addEventListener('click', e=>{
    e.preventDefault();
    e.stopPropagation();
    requestIntroPlayback();
  });
  if (document.readyState === 'complete'){
    setTimeout(()=>requestIntroPlayback(), 120);
  } else {
    window.addEventListener('load', ()=>{ setTimeout(()=>requestIntroPlayback(), 120); }, { once:true });
  }
}

let W = canvas.width, H = canvas.height;
const TARGET_PUMPKINS = 100;
const BASE_LIVES = 3;
const CANDY_BOOST_DURATION = 6000;
const FOG_DURATION = CANDY_BOOST_DURATION;
const BAT_FREEZE_DURATION = 3000;

let NIGHT_MODE=false; try{ const h=new Date().getHours(); NIGHT_MODE=(h>=18||h<6);}catch(e){NIGHT_MODE=false;}

const SIZE_REDUCTION = 0.8;
const BASE_SIZE = {
  pumpkin: 44 * 1.07 * 1.2 * SIZE_REDUCTION * 0.85 * 0.93,
  spider: 44,
  candy: 44,
  web: 44 * 1.07,
  ghost: 66 * 1.07 * 1.2 * SIZE_REDUCTION * 0.85 * 0.93,
  heart: 46,
  bat: 52
};
const FEATURE_SCALE = 1.5;
BASE_SIZE.pumpkin *= FEATURE_SCALE;
BASE_SIZE.ghost   *= FEATURE_SCALE;
BASE_SIZE.web     *= FEATURE_SCALE;
BASE_SIZE.bat     *= FEATURE_SCALE;
if (!NIGHT_MODE) {
  const DAY_SCALE = 1.5;
  const DAY_SPRITE_REDUCTION = 0.85; // shrink daytime sprites by 15%
  BASE_SIZE.pumpkin *= DAY_SCALE * DAY_SPRITE_REDUCTION;
  BASE_SIZE.ghost   *= DAY_SCALE * DAY_SPRITE_REDUCTION;
  BASE_SIZE.web     *= DAY_SCALE * DAY_SPRITE_REDUCTION;
  BASE_SIZE.bat     *= DAY_SCALE;
  BASE_SIZE.spider  *= DAY_SPRITE_REDUCTION;
}
const HAZARD_SHRINK = 0.9;
BASE_SIZE.web *= HAZARD_SHRINK;
BASE_SIZE.bat *= HAZARD_SHRINK;

const HAZARD_EXTRA_SHRINK = 0.9; // additional tweak to reduce hazard sprites by 10%
BASE_SIZE.web *= HAZARD_EXTRA_SHRINK;
BASE_SIZE.bat *= HAZARD_EXTRA_SHRINK;
const SPRITE_SHRINK = 0.85;
BASE_SIZE.pumpkin *= SPRITE_SHRINK;
BASE_SIZE.ghost   *= SPRITE_SHRINK;
const player = { w: 200, h: 38, x: 0, y: 0, vx: 0 };
let basketTargetX = 0;
let basketSlowedUntil = 0;
let basketFrozenUntil = 0;
let quakeModeUntil = 0;
let quakeTimer = null;

let pumpkins = 0, lives = BASE_LIVES;
const MAX_EXTRA_LIVES = 1;
const MAX_LIVES = BASE_LIVES + MAX_EXTRA_LIVES;
let objects = [];
let effects = [];
let lastSpawn = 0, spawnInterval = 720;
let running = false, paused = false;
let lastTime = 0, startTime = 0, elapsedMs = 0;
let diff = 'normal';
let currentDiff = 'normal';
if (typeof window !== 'undefined'){
  window.currentDiff = currentDiff;
}
let candyBoostUntil = 0, webBoostUntil = 0, webStormUntil = 0;
let fogUntil = 0, fogStartAt = 0, fogLevel = 0;
let heartSpawned = false, heartCollected = false;
const HEART_SPAWN_DELAY = 15000;
const HEART_MIN_PUMPKINS = 10;
const HEART_SPIN_RANGE = [0.002, 0.0045];
let lastWinStats = null;

function syncCurrentDiff(value){
  const normalized = (typeof normalizeDifficulty === 'function') ? normalizeDifficulty(value) : (value || 'normal');
  currentDiff = normalized || 'normal';
  if (typeof window !== 'undefined'){
    window.currentDiff = currentDiff;
  }
  return currentDiff;
}

function normalizeDifficulty(value){
  const raw = (value == null) ? '' : String(value);
  const key = raw.trim().toLowerCase();
  return DIFF[key] ? key : 'normal';
}

const WEB_STORM_DURATION = 30000;

const DESIGN_W = 1350, DESIGN_H = 900; let SCALE = 1;
let SIZE_BOOST = 1;
const DIFF_LABELS = { easy:'Легко', normal:'Норм', hard:'Сложно', expert:'Эксперт' };
const SLOW_MODE_NAME = 'Тыквопад';
const SLOW_MODE_EMOJI = '🍬';
const SLOW_MODE_LABEL = `${SLOW_MODE_EMOJI} ${SLOW_MODE_NAME}`;
const SLOW_MODE_HINT = `Режим «${SLOW_MODE_NAME}» активен`;
const QUAKE_MODE_NAME = 'Дрожь';
const QUAKE_MODE_EMOJI = '💥';
const QUAKE_MODE_LABEL = `${QUAKE_MODE_EMOJI} ${QUAKE_MODE_NAME}`;
const QUAKE_MODE_HINT = `Режим «${QUAKE_MODE_NAME}» активен`;

if (slowBadge){
  slowBadge.textContent = SLOW_MODE_LABEL;
  slowBadge.setAttribute('aria-label', SLOW_MODE_HINT);
  slowBadge.setAttribute('title', SLOW_MODE_HINT);
}
if (quakeBadge){
  quakeBadge.textContent = QUAKE_MODE_LABEL;
  quakeBadge.setAttribute('aria-label', QUAKE_MODE_HINT);
  quakeBadge.setAttribute('title', QUAKE_MODE_HINT);
}

function needsSizeBoost(){
  try {
    if (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) return true;
  } catch(_){}
  const vw = window.innerWidth || document.documentElement?.clientWidth || DESIGN_W;
  const vh = window.innerHeight || document.documentElement?.clientHeight || DESIGN_H;
  return Math.min(vw, vh) <= 900;
}

function detectBrowserShell(){
  try {
    if (typeof navigator !== 'undefined'){
      if (typeof navigator.standalone === 'boolean' && navigator.standalone) return false;
      const ua = (navigator.userAgent || '').toLowerCase();
      if (ua.includes('hihalloweenapp') || ua.includes('pumpkincatcher')) return false;
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function'){
      const modes = ['(display-mode: standalone)', '(display-mode: fullscreen)', '(display-mode: minimal-ui)'];
      for (const mode of modes){
        try {
          if (window.matchMedia(mode)?.matches) return false;
        } catch(_){}
      }
    }
  } catch(_){ }
  return true;
}
const IS_BROWSER_VERSION = detectBrowserShell();

function boostedSize(base, min = 0){
  const baseSize = Math.round((base || 44) * SCALE * SIZE_BOOST);
  const minSize = min ? Math.round(min * SIZE_BOOST) : 0;
  return Math.max(minSize, baseSize);
}

function resizeCanvas(){
  const wrap = document.querySelector('.stage');
  const rect = wrap.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const maxLogicalW = Math.round(DESIGN_W * 1.12);
  const logicalW = Math.max(320, Math.min(maxLogicalW, Math.round(rect.width)));
  const availH = Math.max(360, Math.round((window.innerHeight||logicalW) - 80));
  const logicalH = Math.max(Math.round(logicalW * (DESIGN_H / DESIGN_W)), availH);
  canvas.style.width  = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  canvas.width  = Math.round(logicalW * dpr);
  canvas.height = Math.round(logicalH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = logicalW; H = logicalH; SCALE = W / DESIGN_W;
  SIZE_BOOST = needsSizeBoost() ? 1.25 : 1;
  const mobileLike = SIZE_BOOST > 1;
  const MOBILE_BASKET_BASE = 0.375;
  const MOBILE_BASKET_SCALE = MOBILE_BASKET_BASE * 0.85; // shrink basket by 15% on mobile
  const DESKTOP_BASKET_BASE = 0.75;
  const DESKTOP_BASKET_SCALE = DESKTOP_BASKET_BASE * 1.17; // enlarge basket by 17% on desktop
  let basketScale = mobileLike ? MOBILE_BASKET_SCALE : DESKTOP_BASKET_SCALE;
  if (!NIGHT_MODE) {
    basketScale *= 1.15; // enlarge daytime basket by 15%
  }
  const minBasketWidth = Math.max(
    mobileLike ? 72 : 110,
    Math.round((mobileLike ? 90 : 160) * basketScale)
  );
  const minBasketHeight = Math.max(
    mobileLike ? 21 : 34,
    Math.round((mobileLike ? 30 : 52) * basketScale)
  );
  player.w = Math.max(minBasketWidth, Math.round(200 * SCALE * SIZE_BOOST * basketScale));
  player.h = Math.max(minBasketHeight, Math.round(38 * SCALE * SIZE_BOOST * basketScale));
  if (!Number.isFinite(player.x) || player.x === 0) player.x = (W - player.w) / 2;
  else player.x = Math.max(0, Math.min(W - player.w, player.x));
  player.y = Math.round(H * 0.94) - player.h;
  basketTargetX = player.x;
  setParallax();
}
let _rz_t; window.addEventListener('resize', ()=>{ clearTimeout(_rz_t); _rz_t=setTimeout(resizeCanvas,60); });

function setParallax(){
  const cx = player.x + player.w/2;
  const shift = (cx - W/2) * -0.02;
  document.documentElement.style.setProperty('--parallax-x', `${shift}px`);
}

const BPM_MAP = { horroriffic: 92, ghostpocalypse: 78, come_play_with_me: 120, night_of_chaos: 142 };
let CURRENT_BPM = 100;
function filenameFromSrc(src){ try{ const u = new URL(src, location.href); return (u.pathname.split('/').pop()||'').toLowerCase(); } catch(e){ return (src||'').toLowerCase(); } }
function detectTrackKey(){ const f = filenameFromSrc(bgm?.src||''); if (f.includes('horroriffic')) return 'horroriffic'; if (f.includes('ghostpocalypse')) return 'ghostpocalypse'; if (f.includes('come_play_with_me') || f.includes('come%20play%20with%20me')) return 'come_play_with_me'; if (f.includes('night_of_chaos') || f.includes('night%20of%20chaos')) return 'night_of_chaos'; return null; }
function updateBPMFromSrc(){ const key = detectTrackKey(); CURRENT_BPM = BPM_MAP[key] || CURRENT_BPM; }
function beatPhase(bpm = CURRENT_BPM){ const secPerBeat = 60 / Math.max(40, Math.min(220, bpm)); const t = (bgm && !isNaN(bgm.currentTime)) ? bgm.currentTime : performance.now()/1000; const ph = (t % secPerBeat) / secPerBeat; return { ph, sin: Math.sin(ph * Math.PI * 2) }; }

const ASSET_VERSION = 'v12';
function withVer(url){
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}v=${ASSET_VERSION}`;
}
const BG_DAY = withVer('assets/day/bg_video.png');
const BG_NIGHT = withVer('assets/night/bg_video.jpg');
function applyVisualTheme(){
  try{
    const bg = NIGHT_MODE ? BG_NIGHT : BG_DAY;
    const root = document.documentElement;
    root?.style.setProperty('--stage-bg-url', `url("${bg}")`);
    if (root){
      root.classList.toggle('night-mode', NIGHT_MODE);
      root.classList.toggle('day-mode', !NIGHT_MODE);
      const bgVar = NIGHT_MODE ? '--page-bg-night' : '--page-bg-day';
      let bgColor = NIGHT_MODE ? '#0d0c0f' : '#4d7ac2';
      try{
        const resolved = getComputedStyle(root).getPropertyValue(bgVar).trim();
        if (resolved) bgColor = resolved;
      }catch(_){}
      root.style.setProperty('--page-bg-color', bgColor);
    }
    if (document.body){
      document.body.classList.toggle('night-mode', NIGHT_MODE);
      document.body.classList.toggle('day-mode', !NIGHT_MODE);
    }
  }catch(e){ /* ignore */ }
}
applyVisualTheme();
function rand(a,b){return Math.random()*(b-a)+a}
function clockNow(){
  try{
    if(typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  }catch(e){}
  return Date.now();
}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function escapeHtml(str){
  const s = (str==null) ? '' : String(str);
  return s.replace(/[&<>"']/g, ch=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]||ch));
}

const baseFall = { pumpkin:2.2, spider:2.6, candy:2.0, ghost:2.0, web:2.2, heart:2.4, bat:2.35 };
const TYPE_SYMBOL = { pumpkin:'P', spider:'S', candy:'C', ghost:'G', web:'W', heart:'H', bat:'B' };
const BAG_SCALE = 10;
function weightsToBag(weights){
  const bag = [];
  if(!weights) return bag;
  for(const [type, rawWeight] of Object.entries(weights)){
    const weight = Math.max(0, Number(rawWeight) || 0);
    if(weight <= 0) continue;
    const symbol = TYPE_SYMBOL[type] || type;
    const count = Math.max(1, Math.round(weight * BAG_SCALE));
    for(let i=0;i<count;i++) bag.push(symbol);
  }
  return bag;
}
const DIFF = {
  easy:   { spawnBase: 820, spawnMin: 420, fallMul: 0.476, weights: { pumpkin:4,    spider:0.784, candy:1,   ghost:2,   web:0.512 } },
  normal: { spawnBase: 720, spawnMin: 360, fallMul: 0.855, weights: { pumpkin:4,    spider:1.62,  candy:1,   ghost:2,   web:0.81 } },
  hard:   { spawnBase: 400, spawnMin: 200, fallMul: 2.277, weights: { pumpkin:2.88, spider:3.168, ghost:2,   web:1.584 } },
  expert: { spawnBase: 260, spawnMin: 130, fallMul: 3.289, weights: { pumpkin:1.904, spider:3.432, ghost:2, web:1.872, bat:1.12 }, allowHearts: false }
};
for (const profile of Object.values(DIFF)){
  if(profile.weights){
    const bag = weightsToBag(profile.weights);
    if(bag.length) profile.bag = bag;
  }
  if(!profile.bag || !profile.bag.length){
    profile.bag = weightsToBag({ pumpkin:1, spider:1, web:1 });
  }
  profile.bagTypes = bagToTypes(profile.bag);
}
const WEB_STORM_BAG = ['spider','web','spider','web','spider','web','spider','web'];
function bagToTypes(bag){
  return bag.map(c =>
    c==='P' ? 'pumpkin' :
    c==='S' ? 'spider' :
    c==='C' ? 'candy' :
    c==='G' ? 'ghost' :
    c==='H' ? 'heart' :
    c==='B' ? 'bat' :
    'web'
  );
}

function drawPumpkinVec(x,y,s=1){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle='#e56c05'; ctx.beginPath(); ctx.arc(13,13,12,0,Math.PI*2); ctx.fill(); ctx.restore(); }
function drawSpiderVec(x,y,s=1){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.arc(13,13,12,0,Math.PI*2); ctx.fill(); ctx.restore(); }
function drawCandyVec(x,y,s=1){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle='#f64dcc'; ctx.beginPath(); ctx.arc(13,13,12,0,Math.PI*2); ctx.fill(); ctx.restore(); }
function drawGhostVec(x,y,s=1){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle='#e7f0ff'; ctx.beginPath(); ctx.arc(13,13,12,0,Math.PI*2); ctx.fill(); ctx.restore(); }
function drawBatVec(x,y,s=1){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);
  ctx.fillStyle = '#1f2238';
  ctx.beginPath();
  ctx.moveTo(13,6);
  ctx.bezierCurveTo(9,4.5,5.5,8.5,3.5,11.5);
  ctx.bezierCurveTo(1.5,14.5,1,16.5,2.5,18);
  ctx.lineTo(7.5,15.8);
  ctx.lineTo(10.5,19);
  ctx.lineTo(13,15.5);
  ctx.lineTo(15.5,19);
  ctx.lineTo(18.5,15.8);
  ctx.lineTo(23.5,18);
  ctx.bezierCurveTo(25,16.5,24.5,14.5,22.5,11.5);
  ctx.bezierCurveTo(20.5,8.5,17,4.5,13,6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5f7ff';
  ctx.beginPath();
  ctx.arc(11,11.2,1.6,0,Math.PI*2);
  ctx.arc(15,11.2,1.6,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function drawWebVec(x,y,s=1){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.strokeStyle='#c7d8ff'; ctx.beginPath(); ctx.arc(13,13,12,0,Math.PI*2); ctx.stroke(); ctx.restore(); }

const SPRITES = { pumpkin:null, spider:null, candy:null, ghost:null, web:null, basket:null, heart:null, bat:null, basketLogo:null };
const SUPPORTS_WEBP = (() => {
  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) { return false; }
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch (err) {
    return false;
  }
})();

const FALLBACK_SVG_SPRITES = {
  pumpkin: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="pumpkinGlow" cx="48%" cy="45%" r="58%">
      <stop offset="0%" stop-color="#ffd67a"/>
      <stop offset="45%" stop-color="#ff9c2a"/>
      <stop offset="100%" stop-color="#d85806"/>
    </radialGradient>
    <linearGradient id="pumpkinStem" x1="50%" x2="50%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#3c8a3d"/>
      <stop offset="100%" stop-color="#235c20"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="none"/>
  <ellipse cx="32" cy="46" rx="18" ry="6" fill="rgba(0,0,0,0.25)"/>
  <path fill="url(#pumpkinStem)" d="M31 8c1.5-3.5 6-3.5 7.2 0 1.6 4.6-1.4 6.8-2.4 10.6h-5.6C29.9 14.9 29.5 11.6 31 8z"/>
  <path fill="url(#pumpkinGlow)" d="M16 18c-4.6 3.9-7 10.5-6 17s5.5 12.1 11.7 14.6c6.2 2.5 13.4 1.6 18.9-2.4 5.5-4 8.5-10.9 7.7-17.7-.8-6.8-5-12.9-10.9-15.4-6-2.5-13.1-1.4-18.1 3z"/>
  <path fill="rgba(255,255,255,0.22)" d="M22 20c-3.3 2.8-4.8 7.5-3.9 11.9.9 4.4 4.1 8.3 8.2 9.9 4.1 1.6 8.9.8 12.3-2.2 3.4-3 5.2-7.9 4.6-12.6-.6-4.7-3.5-9-7.6-10.6-4.1-1.6-9-.6-13 3.6z"/>
  <path fill="#3c1307" d="M22 36c2.6-2.7 6-4.3 10-4.3S39.4 33.3 42 36l-6 1.8L32 44l-3.9-6.1z"/>
  <circle cx="24.5" cy="32.5" r="3" fill="#291205"/>
  <circle cx="39.5" cy="32.5" r="3" fill="#291205"/>
</svg>` ,
  spider: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="none"/>
  <ellipse cx="32" cy="48" rx="16" ry="6" fill="rgba(0,0,0,0.25)"/>
  <g fill="none" stroke="#101010" stroke-width="4" stroke-linecap="round">
    <path d="M12 26c6 0 9 4 9 10"/>
    <path d="M12 34c6 0 9 4 9 10"/>
    <path d="M52 26c-6 0-9 4-9 10"/>
    <path d="M52 34c-6 0-9 4-9 10"/>
  </g>
  <circle cx="32" cy="30" r="12" fill="#1a1a1a"/>
  <circle cx="32" cy="44" r="10" fill="#1f1f1f"/>
  <circle cx="27" cy="34" r="3" fill="#ff5c6c"/>
  <circle cx="37" cy="34" r="3" fill="#ff5c6c"/>
  <circle cx="27" cy="34" r="1.4" fill="#fff"/>
  <circle cx="37" cy="34" r="1.4" fill="#fff"/>
  <path d="M25 44c2 3 5 5 7 5s5-2 7-5" stroke="#f8f8f8" stroke-width="3" stroke-linecap="round"/>
</svg>` ,
  candy: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="none"/>
  <ellipse cx="32" cy="48" rx="18" ry="7" fill="rgba(0,0,0,0.18)"/>
  <path d="M10 24c5 2.4 7.3 8.8 6.6 12.4C15.2 40 11 42 8 41c-1.6-.5-2.4-2.3-1.8-3.9z" fill="#f7a6f7"/>
  <path d="M54 24c-5 2.4-7.3 8.8-6.6 12.4C48.8 40 53 42 56 41c1.6-.5 2.4-2.3 1.8-3.9z" fill="#f7a6f7"/>
  <rect x="16" y="22" width="32" height="22" rx="11" fill="#ff4fcf"/>
  <path d="M21 25c6 9 16 10 22 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <path d="M21 40c6-9 16-10 22 0" fill="none" stroke="#c30f96" stroke-width="4" stroke-linecap="round"/>
  <circle cx="32" cy="33" r="6" fill="#ffa3ef"/>
</svg>` ,
  ghost: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="none"/>
  <ellipse cx="32" cy="50" rx="16" ry="6" fill="rgba(0,0,0,0.22)"/>
  <path d="M20 48c0 4 3 6 6 6 4 0 4-3 6-3s2 3 6 3 6-2 6-6V28c0-8-6-14-14-14s-14 6-14 14z" fill="#f4f7ff"/>
  <path d="M22 30c0-6 4-10 10-10s10 4 10 10v16c0 3-2 5-4 5s-3-2-6-2-4 2-6 2-4-2-4-5z" fill="#e0e6ff"/>
  <circle cx="27" cy="30" r="3" fill="#1d2248"/>
  <circle cx="37" cy="30" r="3" fill="#1d2248"/>
  <path d="M26 39c2 3 5 4 6 4s4-1 6-4" stroke="#1d2248" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>` ,
  web: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="none"/>
  <circle cx="32" cy="32" r="26" fill="rgba(199,216,255,0.15)"/>
  <g stroke="#c7d8ff" stroke-width="3" fill="none" stroke-linecap="round">
    <circle cx="32" cy="32" r="20"/>
    <circle cx="32" cy="32" r="12"/>
    <path d="M32 12v40"/>
    <path d="M12 32h40"/>
    <path d="M18 18l28 28"/>
    <path d="M46 18L18 46"/>
  </g>
</svg>` ,
  basket: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 64">
  <defs>
    <linearGradient id="basketBody" x1="50%" x2="50%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#f9b35d"/>
      <stop offset="100%" stop-color="#c3752f"/>
    </linearGradient>
    <linearGradient id="basketRim" x1="50%" x2="50%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#f7c88a"/>
      <stop offset="100%" stop-color="#c98238"/>
    </linearGradient>
  </defs>
  <rect width="72" height="64" fill="none"/>
  <ellipse cx="36" cy="56" rx="22" ry="6" fill="rgba(0,0,0,0.24)"/>
  <path d="M22 28c0-8 6-14 14-14s14 6 14 14" fill="none" stroke="#a45e24" stroke-width="6" stroke-linecap="round"/>
  <rect x="10" y="28" width="52" height="26" rx="13" fill="url(#basketBody)"/>
  <rect x="12" y="28" width="48" height="12" rx="6" fill="url(#basketRim)"/>
  <g stroke="#b66a28" stroke-width="4">
    <path d="M18 34l36 18"/>
    <path d="M18 52l36-18"/>
  </g>
</svg>` ,
  bat: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 48">
  <rect width="72" height="48" fill="none"/>
  <path d="M6 30c4-8 10-12 16-10 4 1 8 6 14 6s10-5 14-6c6-2 12 2 16 10-6-2-12 0-18 4l-12 8-12-8c-6-4-12-6-18-4z" fill="#1c1f32"/>
  <path d="M26 18c0-4 3-8 10-8s10 4 10 8-3 8-10 8-10-4-10-8z" fill="#1f2338"/>
  <circle cx="32" cy="20" r="2.6" fill="#ffed6b"/>
  <circle cx="40" cy="20" r="2.6" fill="#ffed6b"/>
  <circle cx="32" cy="20" r="1.1" fill="#1c1f32"/>
  <circle cx="40" cy="20" r="1.1" fill="#1c1f32"/>
</svg>`
};

function loadFallbackSprite(name, cb){
  const svg = FALLBACK_SVG_SPRITES[name];
  if (!svg){ cb(null); return; }
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => cb(img);
  img.onerror = () => cb(null);
  img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function loadSprite(name, cb){
  const tryFallback = () => {
    if (FALLBACK_SVG_SPRITES[name]){
      loadFallbackSprite(name, cb);
    } else {
      cb(null);
    }
  };
  if (!SUPPORTS_WEBP){
    tryFallback();
    return;
  }
  const folder = NIGHT_MODE ? 'assets/night' : 'assets/day';
  const img = new Image();
  img.decoding = 'async';
  img.onload  = () => cb(img);
  img.onerror = tryFallback;
  img.src = `${folder}/${name}.webp`;
}
['pumpkin','spider','candy','ghost','web','basket','bat'].forEach(n => loadSprite(n, img => SPRITES[n] = img));

function loadImage(src, cb){
  const img = new Image();
  img.onload  = () => cb(img);
  img.onerror = () => cb(null);
  img.src = src;
}
loadImage('лого-1.png', img => SPRITES.basketLogo = img);

let drawPumpkin = drawPumpkinVec, drawSpider = drawSpiderVec, drawCandy = drawCandyVec, drawGhost = drawGhostVec, drawWeb = drawWebVec, drawHeart = drawCandyVec, drawBat = drawBatVec;
const _dP = drawPumpkin, _dS = drawSpider, _dC = drawCandy, _dG = drawGhost, _dW = drawWeb, _dH = drawCandyVec, _dB = drawBatVec;

drawPumpkin = (x,y,s=1)=>{
  if (SPRITES.pumpkin){
    const size = 26*s;
    const { sin } = beatPhase(); const bounce = sin*4; const glow = 0.5 + 0.5*Math.max(0,sin);
    ctx.save(); ctx.globalAlpha = 0.35*glow; ctx.fillStyle='rgba(255,150,40,0.9)';
    ctx.beginPath(); ctx.arc(x+size/2,y+size/2+4,size*0.6,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.drawImage(SPRITES.pumpkin,x,y+bounce,size,size);
  } else _dP(x,y,s);
};
drawSpider = (x,y,s=1)=>{ if(SPRITES.spider){ const size=26*s; ctx.drawImage(SPRITES.spider,x,y,size,size);} else _dS(x,y,s); };
drawCandy  = (x,y,s=1)=>{ if(SPRITES.candy){ const size=26*s; const {sin}=beatPhase(); ctx.save(); ctx.translate(x+size/2,y+size/2); ctx.rotate(sin*0.55); ctx.drawImage(SPRITES.candy,-size/2,-size/2,size,size); ctx.restore(); } else _dC(x,y,s); };
drawGhost  = (x,y,s=1)=>{ if(SPRITES.ghost){ const size=26*s; const {ph,sin}=beatPhase(); const fy=sin*10; const fx=Math.sin(ph*Math.PI*2*0.5)*3; ctx.save(); ctx.globalAlpha=0.85+0.15*Math.max(0,sin); ctx.drawImage(SPRITES.ghost,x+fx,y+fy,size,size); ctx.restore(); } else _dG(x,y,s); };
drawWeb    = (x,y,s=1)=>{ if(SPRITES.web){ const size=26*s; const {sin}=beatPhase(); ctx.save(); ctx.translate(x+size/2,y+size/2); ctx.rotate(sin*0.18); ctx.drawImage(SPRITES.web,-size/2,-size/2,size,size); ctx.restore(); } else _dW(x,y,s); };
drawHeart  = (x,y,s=1)=>{
  const size = 28*s;
  if (SPRITES.heart){ ctx.drawImage(SPRITES.heart,x,y,size,size); return; }
  ctx.save();
  ctx.translate(x+size/2, y+size/2);
  const gradient = ctx.createLinearGradient(0,-size/2,0,size/2);
  gradient.addColorStop(0,'#ff4d6d');
  gradient.addColorStop(0.5,'#ff184e');
  gradient.addColorStop(1,'#a70d33');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  const top = -size*0.18;
  ctx.moveTo(0, size*0.32);
  ctx.bezierCurveTo(size*0.7, size*0.05, size*0.65, -size*0.55, 0, -size*0.1+top);
  ctx.bezierCurveTo(-size*0.65, -size*0.55, -size*0.7, size*0.05, 0, size*0.32);
  ctx.closePath();
  ctx.shadowColor = 'rgba(255,80,120,0.6)';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.restore();
};
drawBat = (x,y,s=1)=>{
  if(SPRITES.bat){
    const size = 28*s;
    const { sin } = beatPhase();
    const sway = Math.sin(clockNow() * 0.005) * 4;
    ctx.save();
    ctx.translate(x+size/2, y+size/2);
    ctx.rotate(sin * 0.25);
    ctx.drawImage(SPRITES.bat, -size/2 + sway*0.1, -size/2 + sin*2, size, size);
    ctx.restore();
  } else _dB(x,y,s);
};

let dragging=false, dragPointerId=null, dragOffsetX=0;
function pointerPos(e){
  const r = canvas.getBoundingClientRect();
  const pt = (e.touches && e.touches[0]) || e;
  const scaleX = r.width ? (W / r.width) : 1;
  const scaleY = r.height ? (H / r.height) : 1;
  return {
    x: (pt.clientX - r.left) * scaleX,
    y: (pt.clientY - r.top) * scaleY
  };
}
function followPointer(x){
  const now = clockNow();
  if(now < basketFrozenUntil){
    basketTargetX = player.x;
    return;
  }
  const target = Math.max(0, Math.min(W - player.w, x - dragOffsetX));
  basketTargetX = target;
  if (now >= basketSlowedUntil){
    const clamped = Math.max(0, Math.min(W - player.w, target));
    if (Math.abs(player.x - clamped) > 0.01){
      player.x = clamped;
      setParallax();
    } else {
      player.x = clamped;
    }
  }
}
function follow(e){
  const { x } = pointerPos(e);
  followPointer(x);
}
canvas.addEventListener('pointerdown', e=>{
  if (e.isPrimary === false) return;
  const { x, y } = pointerPos(e);
  dragging = true;
  dragPointerId = e.pointerId;
  const insideBasket = x>=player.x && x<=player.x+player.w && y>=player.y && y<=player.y+player.h;
  dragOffsetX = insideBasket ? Math.max(0, Math.min(player.w, x - player.x)) : player.w / 2;
  try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  followPointer(x);
  if (e.cancelable) e.preventDefault();
});
function endDrag(e){
  if(dragging && (dragPointerId===null || !e || e.pointerId===dragPointerId)){
    if(e){ try{ canvas.releasePointerCapture(e.pointerId); }catch(_){} }
    dragging=false; dragPointerId=null;
  }
}
window.addEventListener('pointerup', e=>{ endDrag(e); });
window.addEventListener('pointercancel', e=>{ endDrag(e); });
canvas.addEventListener('pointermove', e=>{
  if(!dragging) return;
  if(dragPointerId!==null && e.pointerId!==dragPointerId) return;
  if (e.cancelable) e.preventDefault();
  follow(e);
});
canvas.addEventListener('touchstart', e=>{ if (e.cancelable) e.preventDefault(); }, { passive:false });
canvas.addEventListener('touchmove', e=>{ if(dragging && e.cancelable) e.preventDefault(); }, { passive:false });
window.addEventListener('blur', ()=>{ if(dragging) endDrag({ pointerId: dragPointerId }); });


(function setupAudioPlaylist(){
  if (!bgm) return;
  const tracks = [
    { name: 'horroriffic',        remote: 'https://freepd.com/music/Horroriffic.mp3' },
    { name: 'ghostpocalypse',     remote: 'https://freepd.com/music/Ghostpocalypse.mp3' },
    { name: 'come_play_with_me',  remote: 'https://freepd.com/music/Come%20Play%20With%20Me.mp3' },
    { name: 'night_of_chaos',     remote: 'https://freepd.com/music/Night%20of%20Chaos.mp3' }
  ];
  function tryLocalSources(n){ return [`assets/audio/${n}.mp3`, `assets/audio/${n}.MP3`]; }
  let currentIndex = 0;
  let autoplay = false;
  let lastErrorHandler = null;

  function loadTrack(idx){
    currentIndex = (idx + tracks.length) % tracks.length;
    const item = tracks[currentIndex];
    const sources = [...tryLocalSources(item.name), item.remote];
    let attempt = 0;

    if (lastErrorHandler){ bgm.removeEventListener('error', lastErrorHandler); lastErrorHandler = null; }

    const handleError = () => {
      if (attempt < sources.length){
        bgm.src = sources[attempt++];
        bgm.load?.();
        return;
      }
      if (lastErrorHandler){ bgm.removeEventListener('error', lastErrorHandler); lastErrorHandler = null; }
    };
    lastErrorHandler = handleError;
    bgm.addEventListener('error', handleError);

    bgm.src = sources[attempt++];
    bgm.load?.();
    bgm.currentTime = 0;
    setTimeout(updateBPMFromSrc, 0);
    if (autoplay) bgm.play().catch(()=>{});

    bgm.addEventListener('loadeddata', ()=>{
      if (lastErrorHandler){ bgm.removeEventListener('error', lastErrorHandler); lastErrorHandler = null; }
    }, { once:true });
  }

  function nextTrack(){
    loadTrack(currentIndex + 1);
    if (autoplay) bgm.play().catch(()=>{});
  }

  loadTrack(0);
  bgm.loop = false;
  bgm.addEventListener('ended', ()=>{ nextTrack(); setTimeout(updateBPMFromSrc,0); });
  bgm.addEventListener('playing', updateBPMFromSrc);
  bgm.addEventListener('loadedmetadata', updateBPMFromSrc);
  bgm.addEventListener('error', ()=>{ if(!lastErrorHandler) nextTrack(); });

  btnVol.addEventListener('click', ()=>{ bgm.muted = !bgm.muted; btnVol.textContent = bgm.muted ? '🔇' : '🔊'; });

  function kickOffPlayback(){
    if (!introFinished) return;
    autoplay = true;
    bgm.play().catch(()=>{});
  }

  ['pointerdown','click','touchstart','keydown'].forEach(ev => window.addEventListener(ev, ()=>{
    kickOffPlayback();
  }, { passive:true }));

  document.addEventListener('introFinished', ()=>{
    kickOffPlayback();
  });

  if (introFinished){
    setTimeout(()=>kickOffPlayback(), 0);
  }
})();

const SFX = (()=>{
  let ctx = null;
  const pending = [];
  const gestures = ['pointerdown','touchstart','click','keydown'];

  function ensureCtx(){
    if (ctx){
      if (ctx.state === 'suspended'){ ctx.resume().catch(()=>{}); }
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try{ ctx = new AC(); }
    catch(e){ ctx = null; return null; }
    return ctx;
  }

  function flush(){
    const c = ensureCtx();
    if (!c) return;
    while(pending.length){ const fn = pending.shift(); try{ fn(c); }catch(_){} }
  }

  gestures.forEach(ev => window.addEventListener(ev, flush, { passive:true }));

  function withCtx(fn){
    const c = ensureCtx();
    if (c) fn(c);
    else if (pending.length < 16) pending.push(fn);
  }

  function playNotes(notes){
    withCtx(ctx => {
      const base = ctx.currentTime + 0.02;
      for (const note of notes){
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = base + (note.start || 0);
        const dur = Math.max(0.05, note.dur || 0.3);
        const end = start + dur;
        const attack = Math.max(0.005, note.attack || 0.01);
        const release = Math.max(0.03, note.release || 0.14);
        const vol = Math.max(0.0001, note.vol || 0.25);
        osc.type = note.type || 'sine';
        if (note.freq) osc.frequency.setValueAtTime(note.freq, start);
        if (note.detune) osc.detune.setValueAtTime(note.detune, start);
        gain.gain.setValueAtTime(0.0001, start);
        if (note.curve === 'linear'){
          gain.gain.linearRampToValueAtTime(vol, start + attack);
          gain.gain.linearRampToValueAtTime(0.0001, end);
        } else {
          gain.gain.exponentialRampToValueAtTime(vol, start + attack);
          gain.gain.exponentialRampToValueAtTime(0.0001, end);
        }
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end + release);
      }
    });
  }

  function pumpkin(){
    playNotes([
      { freq: 520, type: 'triangle', dur:0.18, vol:0.16 },
      { freq: 780, type: 'sine', start:0.08, dur:0.16, vol:0.12 }
    ]);
  }
  function candy(){
    playNotes([
      { freq: 640, type: 'sine', dur:0.22, vol:0.18 },
      { freq: 960, type: 'triangle', start:0.12, dur:0.24, vol:0.15 }
    ]);
  }
  function bad(){
    playNotes([
      { freq: 220, type: 'sawtooth', dur:0.4, vol:0.28 },
      { freq: 110, type: 'square', start:0.05, dur:0.45, vol:0.3 }
    ]);
  }
  function heart(){
    playNotes([
      { freq: 560, type: 'triangle', dur:0.25, vol:0.2 },
      { freq: 840, type: 'sine', start:0.12, dur:0.3, vol:0.18 },
      { freq: 1120, type: 'sine', start:0.2, dur:0.35, vol:0.12 }
    ]);
  }
  function win(){
    playNotes([
      { freq: 660, type:'triangle', dur:0.25, vol:0.22 },
      { freq: 830, type:'sine', start:0.18, dur:0.3, vol:0.2 },
      { freq: 990, type:'triangle', start:0.32, dur:0.35, vol:0.18 }
    ]);
  }

  return { pumpkin, candy, bad, heart, win };
})();

function spawnHeart(now, profile){
  if(profile && profile.allowHearts === false) return false;
  if(heartSpawned || heartCollected) return false;
  if(now < webStormUntil) return false;
  if(now - startTime < HEART_SPAWN_DELAY) return false;
  if(pumpkins < HEART_MIN_PUMPKINS) return false;
  const type = 'heart';
  const size = boostedSize(BASE_SIZE[type] || 44, 32);
  const fallMul = profile?.fallMul || 1;
  const vy = (baseFall[type] + (Math.random()*0.6-0.2)) * fallMul;
  const half = size/2;
  const x = rand(half, W-half);
  const y = -size;
  const spinSign = Math.random() < 0.5 ? -1 : 1;
  const spinSpeed = (Math.random() * (HEART_SPIN_RANGE[1] - HEART_SPIN_RANGE[0]) + HEART_SPIN_RANGE[0]) * spinSign;
  objects.push({ type, x, y, vy, size, rot: 0, spin: spinSpeed });
  heartSpawned = true;
  return true;
}

function spawnBatCluster(now, profile){
  const type = 'bat';
  const size = boostedSize(BASE_SIZE[type] || 44, 28);
  const fallMul = profile?.fallMul || 1;
  const baseVy = (baseFall[type] + (Math.random()*0.6 - 0.3)) * fallMul;
  const count = Math.random() < 0.5 ? 3 : 6;
  const spread = Math.max(size * 0.85, 42);
  const pattern = count === 3
    ? [
        { dx: 0, dy: 0 },
        { dx: -spread, dy: -size * 0.7 },
        { dx: spread, dy: -size * 0.7 }
      ]
    : [
        { dx: 0, dy: 0 },
        { dx: -spread * 0.9, dy: -size * 0.55 },
        { dx: spread * 0.9, dy: -size * 0.55 },
        { dx: -spread * 1.8, dy: -size * 1.05 },
        { dx: spread * 1.8, dy: -size * 1.05 },
        { dx: 0, dy: -size * 1.55 }
      ];
  const half = size / 2;
  const dxValues = pattern.map(p => p.dx);
  const minDx = Math.min(...dxValues);
  const maxDx = Math.max(...dxValues);
  const minCenter = Math.max(half, half - minDx);
  const maxCenter = Math.min(W - half, W - half - maxDx);
  const fallbackCenter = Math.max(half, Math.min(W - half, W / 2));
  const center = (minCenter <= maxCenter) ? rand(minCenter, maxCenter) : fallbackCenter;
  for(const point of pattern){
    const x = center + point.dx + rand(-size * 0.08, size * 0.08);
    const y = -size + point.dy + rand(-size * 0.05, size * 0.05);
    const vy = baseVy * (0.92 + Math.random() * 0.16);
    objects.push({ type, x, y, vy, size });
  }
}

function spawn(now){
  if(now-lastSpawn<spawnInterval) return;
  lastSpawn=now;
  const profile=DIFF[diff];
  const inStorm = now < webStormUntil;
  if(!inStorm && spawnHeart(now, profile)) return;
  const bag = inStorm ? WEB_STORM_BAG : (profile.bagTypes || (profile.bagTypes = bagToTypes(profile.bag)));
  const type = bag[(Math.random()*bag.length)|0] || 'spider';
  if(type === 'bat'){
    spawnBatCluster(now, profile);
  } else {
    const size = boostedSize(BASE_SIZE[type] || 44, 28);
    let vy=(baseFall[type]+(Math.random()*1.0-0.4))*profile.fallMul;
    if(inStorm) vy *= 1.28;
    const half=size/2, x=rand(half,W-half), y=-size;
    objects.push({type,x,y,vy,size});
  }
  const baseInterval = Math.max(profile.spawnMin, profile.spawnBase - pumpkins*2.4);
  if(inStorm){
    const faster = Math.max(profile.spawnMin * 0.4, baseInterval * 0.45);
    spawnInterval = faster;
  } else {
    spawnInterval = baseInterval;
  }
}

function spawnGhostEscape(o, now){
  const baseSize = boostedSize(BASE_SIZE.ghost || 54, 32);
  const ghostSize = Math.max(baseSize, Math.round((o?.size || baseSize)));
  const pumpkinSize = boostedSize((BASE_SIZE.pumpkin || 44) * 0.9, 24);
  const centerX = Number.isFinite(o?.x) ? o.x : (player.x + player.w / 2);
  const startY = player.y + player.h * 0.25;
  const basketCenter = player.x + player.w / 2;
  const dir = centerX >= basketCenter ? 1 : -1;
  const speed = 2.4 + Math.random() * 1.6;
  effects.push({
    type: 'ghostEscape',
    x: centerX,
    y: startY,
    vx: dir * speed * 0.65,
    vy: -(speed * 1.4),
    ay: -0.04,
    size: ghostSize,
    pumpkinSize,
    born: now,
    life: 1800 + Math.random() * 500,
    alpha: 1,
    rot: 0,
    spin: dir * 0.0025
  });
}

function scheduleQuakeRemoval(){
  if(!stageEl) return;
  if(quakeTimer) clearTimeout(quakeTimer);
  const now = clockNow();
  const target = Math.max(basketFrozenUntil, quakeModeUntil);
  const delay = Math.max(30, Math.round(Math.max(0, target - now)));
  quakeTimer = setTimeout(()=>{
    const current = clockNow();
    const remaining = Math.max(basketFrozenUntil, quakeModeUntil);
    if(current >= remaining - 8){
      stageEl.classList.remove('stage--quake');
      quakeTimer = null;
    } else {
      scheduleQuakeRemoval();
    }
  }, delay);
}

function triggerBasketStun(now, duration = BAT_FREEZE_DURATION){
  const until = now + duration;
  basketFrozenUntil = Math.max(basketFrozenUntil, until);
  quakeModeUntil = Math.max(quakeModeUntil, until);
  basketTargetX = player.x;
  if(stageEl){
    stageEl.classList.add('stage--quake');
    scheduleQuakeRemoval();
  }
  quakeBadge?.classList.remove('hidden');
}

function clearBasketStun(){
  basketFrozenUntil = 0;
  quakeModeUntil = 0;
  if(stageEl){
    stageEl.classList.remove('stage--quake');
  }
  if(quakeTimer){
    clearTimeout(quakeTimer);
    quakeTimer = null;
  }
  quakeBadge?.classList.add('hidden');
}

function collides(o){
  const bx=player.x, by=player.y, bw=player.w, bh=player.h;
  const r=(o.size||44)*0.5;
  const cx=Math.max(bx,Math.min(o.x,bx+bw));
  const cy=Math.max(by,Math.min(o.y,by+bh));
  const dx=o.x-cx, dy=o.y-cy;
  return(dx*dx+dy*dy)<=r*r;
}
function applyCatch(o,now){
  if(o.type==='pumpkin'){pumpkins=Math.min(TARGET_PUMPKINS,pumpkins+1); SFX.pumpkin();}
  else if(o.type==='spider'){pumpkins=Math.max(0,pumpkins-1);lives=Math.max(0,lives-1); SFX.bad();}
  else if(o.type==='ghost'){
    pumpkins=Math.max(0,pumpkins-1);
    spawnGhostEscape(o, now);
    SFX.bad();
  }
  else if(o.type==='candy'){candyBoostUntil=now + CANDY_BOOST_DURATION; SFX.candy();}
  else if(o.type==='web'){
    const stormEnd = now + WEB_STORM_DURATION;
    const fogEnd = now + FOG_DURATION;
    webBoostUntil = Math.max(webBoostUntil, stormEnd);
    webStormUntil = Math.max(webStormUntil, stormEnd);
    if(now >= fogUntil){ fogStartAt = now; }
    fogUntil = Math.max(fogUntil, fogEnd);
    basketSlowedUntil = Math.max(basketSlowedUntil, stormEnd);
    if(candyBoostUntil > now) candyBoostUntil = now;
    SFX.bad();
  }
  else if(o.type==='bat'){
    triggerBasketStun(now, BAT_FREEZE_DURATION);
    SFX.bad();
  }
  else if(o.type==='heart'){
    if(!heartCollected){
      heartCollected = true;
      lives = Math.min(MAX_LIVES, lives + 1);
      SFX.heart();
    }
  }
  if(pumpkins>=TARGET_PUMPKINS)win(now);
  if(lives<=0)lose();
}
function speedMultiplier(type, now){
  let mult = 1;
  if(now < candyBoostUntil){
    if(type==='pumpkin' || type==='candy') mult *= 1.45;
    if(type==='spider' || type==='web') mult *= 0.65;
  }
  if(now < webBoostUntil){
    if(type==='pumpkin' || type==='candy') mult *= 0.65;
    if(type==='spider' || type==='web') mult *= 1.55;
  }
  return mult;
}
function updatePlayerMotion(dt, now){
  if(now < basketFrozenUntil){
    basketTargetX = player.x;
    return;
  }
  if(stageEl && quakeModeUntil <= now){
    stageEl.classList.remove('stage--quake');
  }
  const target = Math.max(0, Math.min(W - player.w, basketTargetX));
  basketTargetX = target;
  if(now >= basketSlowedUntil){
    const clamped = Math.max(0, Math.min(W - player.w, player.x));
    if(Math.abs(clamped - player.x) > 0.01){
      player.x = clamped;
      setParallax();
    } else {
      player.x = clamped;
    }
    basketTargetX = player.x;
    return;
  }
  const diff = target - player.x;
  if(Math.abs(diff) < 0.5){
    const prev = player.x;
    player.x = target;
    if(Math.abs(prev - player.x) > 0.01) setParallax();
    basketTargetX = player.x;
    return;
  }
  const stiffness = 0.0032;
  const maxStep = Math.max(0.9, W * 0.008);
  const step = diff * dt * stiffness;
  const move = Math.max(-maxStep, Math.min(maxStep, step));
  const newX = Math.max(0, Math.min(W - player.w, player.x + move));
  if(Math.abs(newX - player.x) > 0.01){
    player.x = newX;
    setParallax();
  }
}
function update(dt,now){
  elapsedMs=now-startTime; timerEl.textContent=`⏱ ${(elapsedMs/1000).toFixed(1)}s`;
  scoreEl.textContent=`🎃 ${pumpkins} / ${TARGET_PUMPKINS}`;
  const cappedLives = Math.min(lives, MAX_LIVES);
  const emptySlots = Math.max(0, BASE_LIVES - cappedLives);
  livesEl.textContent='❤️'.repeat(cappedLives)+'🤍'.repeat(emptySlots);
  if(slowBadge) slowBadge.classList.toggle('hidden', !(now<candyBoostUntil));
  if(fastBadge) fastBadge.classList.toggle('hidden', !(now<webBoostUntil));
  if(quakeBadge) quakeBadge.classList.toggle('hidden', !(now<quakeModeUntil));
  objects=objects.filter(o=>{
    const mult = speedMultiplier(o.type, now);
    o.y+=o.vy*mult*dt*0.06;
    if(o.spin){ o.rot = (o.rot||0) + o.spin * dt; }
    if(collides(o)){applyCatch(o,now);return false;}
    return o.y<=H+60;
  });
  updatePlayerMotion(dt, now);
  updateEffects(dt, now);
}

function drawObjects(){
  for(const o of objects){
    const sc = (o.size||44)/26;
    if(o.type==='heart'){
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot || 0);
      ctx.translate(-(o.size/2), -(o.size/2));
      drawHeart(0,0,sc);
      ctx.restore();
      continue;
    }
    ctx.save(); ctx.translate(o.x-(o.size/2), o.y-(o.size/2));
    if(o.type==='pumpkin')drawPumpkin(0,0,sc);
    else if(o.type==='spider')drawSpider(0,0,sc);
    else if(o.type==='candy')drawCandy(0,0,sc);
    else if(o.type==='ghost')drawGhost(0,0,sc);
    else if(o.type==='web')drawWeb(0,0,sc);
    else if(o.type==='bat')drawBat(0,0,sc);
    ctx.restore();
  }
}

function updateEffects(dt, now){
  const step = dt * 0.06;
  effects = effects.filter(e=>{
    if(e.type==='ghostEscape'){
      e.x += (e.vx||0) * step;
      e.y += (e.vy||0) * step;
      if(Number.isFinite(e.ay)) e.vy += e.ay * step;
      else e.vy -= 0.002 * dt;
      if(e.spin) e.rot = (e.rot||0) + e.spin * dt;
      const age = now - (e.born||now);
      const life = e.life || 1600;
      if(age > life) return false;
      const fadeStart = life * 0.55;
      if(age > fadeStart){
        const fadeSpan = Math.max(120, life - fadeStart);
        e.alpha = Math.max(0, 1 - (age - fadeStart) / fadeSpan);
      } else {
        e.alpha = 1;
      }
      return e.y > -160 && e.x > -160 && e.x < W + 160;
    }
    return false;
  });
}

function drawEffects(){
  if(!effects.length) return;
  for(const e of effects){
    if(e.type==='ghostEscape'){
      const size = e.size || 44;
      const ghostScale = size / 26;
      const pumpkinScale = (e.pumpkinSize || size * 0.6) / 26;
      ctx.save();
      ctx.globalAlpha = e.alpha ?? 1;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot || 0);
      ctx.translate(-size/2, -size/2);
      drawGhost(0,0,ghostScale);
      const px = size*0.18;
      const py = size*0.58;
      drawPumpkin(px,py,pumpkinScale);
      ctx.restore();
    }
  }
}

function computeFogAlpha(now){
  if(now >= fogUntil) return 0;
  const elapsed = Math.max(0, now - fogStartAt);
  const remaining = Math.max(0, fogUntil - now);
  const fadeIn = Math.min(1, elapsed / 900);
  const fadeOut = Math.min(1, remaining / 1100);
  const core = Math.min(fadeIn, fadeOut);
  const pulse = 0.06 * Math.sin(now * 0.0023);
  return Math.min(0.82, 0.18 + core * 0.68 + pulse);
}

function drawFog(now){
  const target = computeFogAlpha(now);
  fogLevel += (target - fogLevel) * 0.14;
  if(fogLevel <= 0.02) return;
  const t = now * 0.00006;
  ctx.save();
  ctx.globalAlpha = fogLevel * 0.85;
  const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
  baseGrad.addColorStop(0, 'rgba(190,206,244,0.42)');
  baseGrad.addColorStop(0.55, 'rgba(164,184,226,0.38)');
  baseGrad.addColorStop(1, 'rgba(124,142,188,0.32)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(-40, -80, W + 80, H + 160);

  ctx.globalCompositeOperation = 'lighter';
  for(let i=0;i<4;i++){
    const speed = 0.18 + i * 0.07;
    const offset = (t * speed + i * 0.37) % 1;
    const y = offset * (H + 280) - 180;
    const height = H * (0.32 + 0.08 * Math.sin(t * 6.2 + i));
    const layer = ctx.createLinearGradient(0, y, 0, y + height);
    layer.addColorStop(0, `rgba(214,226,255,${0.22 + i*0.05})`);
    layer.addColorStop(0.45, `rgba(202,214,244,${0.18 + i*0.04})`);
    layer.addColorStop(1, 'rgba(202,214,244,0)');
    ctx.globalAlpha = fogLevel * (0.22 + i * 0.12);
    ctx.fillStyle = layer;
    ctx.fillRect(-120, y, W + 240, height);
  }

  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = fogLevel * 0.42;
  for(let i=0;i<3;i++){
    const angle = t * (0.8 + i * 0.22);
    const cx = W * (0.22 + i * 0.32) + Math.sin(angle) * W * 0.1;
    const cy = H * (0.18 + i * 0.22) + Math.cos(angle * 1.4) * H * 0.12;
    const rx = W * (0.42 + Math.sin(angle * 1.6) * 0.08);
    const ry = H * (0.26 + Math.cos(angle * 1.3) * 0.06);
    const swirl = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.18, cx, cy, Math.max(rx, ry));
    swirl.addColorStop(0, 'rgba(230,236,255,0.38)');
    swirl.addColorStop(1, 'rgba(230,236,255,0)');
    ctx.fillStyle = swirl;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, angle * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = fogLevel * 0.22;
  ctx.fillStyle = 'rgba(12,18,36,0.85)';
  ctx.fillRect(-60, -60, W + 120, H + 120);
  ctx.restore();
}

function drawPlayer(){
  const {x,y,w,h} = player;

  if (SPRITES.basket){
    const imgW = w;
    const imgH = h * 2.2;
    const imgY = y - (imgH - h);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18;
    ctx.drawImage(SPRITES.basket, x, imgY, imgW, imgH);
    ctx.restore();
    return;
  }

  ctx.save();
  const bodyH = h * 2.1;
  const top = y - (bodyH - h);
  const radius = Math.max(10, 14*SCALE);
  const g = ctx.createLinearGradient(0, top, 0, top + bodyH);
  g.addColorStop(0, '#9c5f24'); g.addColorStop(0.5, '#b87333'); g.addColorStop(1, '#7a4518');
  ctx.fillStyle = g; ctx.strokeStyle = '#552e12'; ctx.lineWidth = Math.max(1.5, 2*SCALE);
  rounded(x, top, w, bodyH, radius); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c8843b'; rounded(x, top-10*SCALE, w, 16*SCALE, 10*SCALE); ctx.fill(); ctx.strokeStyle = '#5f3618'; ctx.stroke();
  ctx.lineWidth = Math.max(3, 5*SCALE); ctx.strokeStyle = '#8b551f';
  ctx.beginPath();
  ctx.moveTo(x+16*SCALE, top+10*SCALE); ctx.quadraticCurveTo(x-8*SCALE, top+bodyH*0.2, x+16*SCALE, top+bodyH*0.38);
  ctx.moveTo(x+w-16*SCALE, top+10*SCALE); ctx.quadraticCurveTo(x+w+8*SCALE, top+bodyH*0.2, x+w-16*SCALE, top+bodyH*0.38);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, 3*SCALE); ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for(let i=0;i<=10;i++){ const xx=x+(i/10)*w; ctx.beginPath(); ctx.moveTo(xx, top+6*SCALE); ctx.lineTo(xx, top+bodyH-6*SCALE); ctx.stroke(); }
  ctx.lineWidth = Math.max(3, 4*SCALE);
  const rows = 8;
  for(let r=0;r<rows;r++){ const yy=top+16*SCALE+r*((bodyH-32*SCALE)/(rows-1)); ctx.strokeStyle=r%2?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.10)'; ctx.beginPath(); ctx.moveTo(x+8*SCALE, yy); ctx.lineTo(x+w-8*SCALE, yy); ctx.stroke(); }
  ctx.restore();
}

function loop(ts){
  if(!lastTime)lastTime=ts;
  const dt=Math.min(32,ts-lastTime); lastTime=ts;
  spawn(ts); update(dt,ts);
  ctx.clearRect(0,0,W,H);
  drawObjects(); drawPlayer(); drawEffects(); drawFog(ts);
  if(running && !paused) requestAnimationFrame(loop);
}

const winDetails = document.getElementById('winDetails');
const winNickEl = document.getElementById('winNick');
const winTimeEl = document.getElementById('winTime');
const winDiffEl = document.getElementById('winDiff');
const winLeaderboardEl = document.getElementById('winLeaderboard');
const winBonusEl = document.getElementById('winBonus');
const LEADERBOARD_DISPLAY_LIMIT = 3;
const RECENT_LEADERBOARD_LIMIT = 8;
let lastLeaderboardEntry = null;

function getRecordDisplayNick(record){
  const raw = record && typeof record.nick === 'string' ? record.nick : '';
  const trimmed = (raw || '').trim();
  if(trimmed && trimmed !== 'Игрок') return trimmed;
  const cached = (cachedNick || '').trim();
  if(cached) return cached;
  const stored = (loadNick() || '').trim();
  if(stored){
    cachedNick = stored;
    return stored;
  }
  return 'Игрок';
}
function resetVictoryPanel(){
  messageOverlay?.classList.remove('victory');
  messageOverlay?.classList.remove('loss');
  winDetails?.classList.remove('hidden');
  winActions?.classList.remove('hidden');
  lossActions?.classList.add('hidden');
  if(winNickEl) winNickEl.textContent = '—';
  if(winTimeEl) winTimeEl.textContent = '—';
  if(winDiffEl) winDiffEl.textContent = '—';
  if(winLeaderboardEl) winLeaderboardEl.innerHTML = '<p class="empty">Таблица загружается…</p>';
  if(winBonusEl){
    winBonusEl.textContent = '';
    winBonusEl.classList.add('hidden');
  }
}
function buildLeaderboardBlock(title, rows, { emptyText = 'Нет записей', footerText = '' } = {}){
  let html = '<div class="leaderboard-block">';
  if(title){
    html += `<h4>${escapeHtml(title)}</h4>`;
  }
  if(!rows || !rows.length){
    html += `<p class="empty">${escapeHtml(emptyText)}</p>`;
    html += '</div>';
    return html;
  }
  const body = rows.map((row, idx)=>{
    const place = row.__place != null ? row.__place : (idx + 1);
    const nick = escapeHtml(getRecordDisplayNick(row));
    const diffName = escapeHtml(DIFF_LABELS[row.diff] || row.diff || '');
    const timeText = typeof row.seconds === 'number' ? formatTime(row.seconds) : '—';
    const isCurrent = !!row.__current;
    const label = isCurrent ? '<span class="tag-current">Вы</span>' : '';
    const cls = isCurrent ? ' class="is-current"' : '';
    return `<tr${cls}><td>${place}</td><td>${nick}${label}</td><td>${diffName}</td><td>${timeText}</td></tr>`;
  }).join('');
  html += '<table class="mini-table">';
  html += '<thead><tr><th>#</th><th>Ник</th><th>Сложность</th><th>Время</th></tr></thead>';
  html += `<tbody>${body}</tbody>`;
  if(footerText){
    html += `<tfoot><tr><td colspan="4">${escapeHtml(footerText)}</td></tr></tfoot>`;
  }
  html += '</table></div>';
  return html;
}

function computeBestLeaderboardRows(allRows, highlight, limit = LEADERBOARD_DISPLAY_LIMIT){
  const sorted = allRows.slice().sort((a,b)=> a.seconds - b.seconds);
  const highlightIndex = highlight ? sorted.findIndex(r=> r.ts === highlight.ts) : -1;
  const rows = sorted.slice(0, limit).map((row,i)=>({ ...row, __place: i+1, __current: highlight && row.ts === highlight.ts }));
  if(highlight && highlightIndex >= limit){
    rows.push({ ...sorted[highlightIndex], __place: highlightIndex + 1, __current: true, __appended: true });
  }
  return {
    rows,
    total: sorted.length,
    highlightPlace: highlightIndex >= 0 ? highlightIndex + 1 : null,
    trimmed: sorted.length > limit
  };
}

function computeRecentLeaderboardRows(allRows, highlight, limit = RECENT_LEADERBOARD_LIMIT){
  let recent = allRows.slice(-limit);
  if(highlight){
    const exists = recent.some(r=> r.ts === highlight.ts);
    if(!exists){
      recent.push(highlight);
      recent = recent.slice(-limit);
    }
  }
  recent = recent.slice().sort((a,b)=> (b.ts||0) - (a.ts||0));
  return recent.map((row,i)=>({ ...row, __place: i+1, __current: highlight && row.ts === highlight.ts }));
}

function buildLeaderboardMarkup(allRows, highlight, {
  limit = LEADERBOARD_DISPLAY_LIMIT,
  recentLimit = RECENT_LEADERBOARD_LIMIT,
  bestTitle = 'Лучшие результаты',
  recentTitle = 'Последние 8 игр',
  bestEmptyText = 'Нет записей',
  recentEmptyText = 'Ещё никто не играл'
} = {}){
  const bestInfo = computeBestLeaderboardRows(allRows, highlight, limit);
  const recentRows = computeRecentLeaderboardRows(allRows, highlight, recentLimit);
  const footerBits = [];
  if(bestInfo.trimmed){
    footerBits.push(`Показаны топ-${Math.min(limit, bestInfo.total)} из ${bestInfo.total}.`);
  }
  if(bestInfo.highlightPlace && bestInfo.highlightPlace > limit){
    footerBits.push(`Ваш результат на ${bestInfo.highlightPlace}-м месте.`);
  }
  const bestBlock = buildLeaderboardBlock(bestTitle, bestInfo.rows, {
    emptyText: bestEmptyText,
    footerText: footerBits.join(' ')
  });
  const recentBlock = buildLeaderboardBlock(recentTitle, recentRows, {
    emptyText: recentEmptyText
  });
  return `<div class="leaderboard-sections">${bestBlock}${recentBlock}</div>`;
}

function buildVictoryLeaderboard(limit=LEADERBOARD_DISPLAY_LIMIT){
  try{
    const allRows = loadLeaderboard();
    if(!allRows.length) return '<p class="empty">Станьте первым в рейтинге!</p>';
    return buildLeaderboardMarkup(allRows, lastLeaderboardEntry, {
      limit,
      recentLimit: RECENT_LEADERBOARD_LIMIT,
      bestTitle: 'Лучшие результаты',
      recentTitle: 'Последние 8 игр',
      bestEmptyText: 'Станьте первым в рейтинге!'
    });
  }catch(e){
    return '<p class="empty">Не удалось загрузить таблицу.</p>';
  }
}

function showVictory(now){
  running=false;
  paused=false;
  if(!(messageOverlay&&msgTitle&&msgText)) return;
  const elapsed = Math.max(0,(now-startTime)/1000);
  const mode = currentDiff||diff||'normal';
  const modeLabel = DIFF_LABELS[mode] || mode;
  const displayName = resolveNick();
  msgTitle.textContent='🎉 Победа!';
  const safeNick = escapeHtml(displayName);
  const safeDiff = escapeHtml(modeLabel);
  const timeText = formatTime(elapsed);
  msgText.innerHTML = `Поздравляем, <strong>${safeNick}</strong>! Вы собрали ${TARGET_PUMPKINS} тыкв за ${timeText} на уровне «${safeDiff}».`;
  if(winNickEl) winNickEl.textContent = displayName;
  if(winTimeEl) winTimeEl.textContent = timeText;
  if(winDiffEl) winDiffEl.textContent = modeLabel;
  try{
    recordAttempt(mode, elapsed);
    pushLeaderboard(displayName, mode, elapsed);
  }catch(e){}
  if(winLeaderboardEl) winLeaderboardEl.innerHTML = buildVictoryLeaderboard(LEADERBOARD_DISPLAY_LIMIT);
  if(winBonusEl){
    winBonusEl.textContent = 'За отличную игру вы добавлены в рейтинг лучших игроков! Играйте дальше, чтобы улучшить свой результат и собрать все тыквы на экспертном уровне.';
    winBonusEl.classList.remove('hidden');
  }
  messageOverlay.classList.remove('loss');
  messageOverlay.classList.add('victory');
  messageOverlay.classList.remove('hidden');
  try{ document.body.classList.add('modal-open'); }catch(e){}
  confettiKick();
  lastWinStats = {
    seconds: elapsed,
    mode,
    modeLabel,
    nick: displayName
  };
  try{ renderLeaderboard(); }catch(_){}
}
function win(now){
  SFX.win();
  showVictory(now);
}
function lose(){
  running=false;
  paused=false;
  resetVictoryPanel();
  const nick = resolveNick();
  msgTitle.textContent='Игра окончена';
  msgText.innerHTML = `Жизни закончились, <strong>${escapeHtml(nick)}</strong>. Попробуйте еще раз.`;
  winActions?.classList.add('hidden');
  lossActions?.classList.remove('hidden');
  messageOverlay.classList.remove('victory');
  messageOverlay.classList.add('loss');
  messageOverlay.classList.remove('hidden');
  try{ document.body.classList.add('modal-open'); }catch(e){}
}

function openMainMenu(){
  running = false;
  paused = false;
  pausedBadge?.classList.add('hidden');
  slowBadge?.classList.add('hidden');
  fastBadge?.classList.add('hidden');
  clearBasketStun();
  if(messageOverlay){
    messageOverlay.classList.add('hidden');
    messageOverlay.classList.remove('victory');
    messageOverlay.classList.remove('loss');
  }
  resetVictoryPanel();
  if(startOverlay){
    startOverlay.classList.remove('hidden');
  }
  try{ document.body.classList.add('modal-open'); }catch(e){}
}

function startGame(difficulty){
  const mode = normalizeDifficulty(difficulty);
  diff = mode;
  syncCurrentDiff(diff);
  pumpkins=0; lives=BASE_LIVES; objects.length=0; lastSpawn=0;
  effects.length=0;
  clearBasketStun();
  candyBoostUntil=0; webBoostUntil=0; webStormUntil=0;
  fogUntil=0; fogStartAt=0; fogLevel=0; basketSlowedUntil=0;
  heartSpawned=false; heartCollected=false;
  lastWinStats=null;
  spawnInterval=DIFF[diff].spawnBase;
  running=true; paused=false; lastTime=0; startTime=performance.now();
  startOverlay.classList.add('hidden'); messageOverlay.classList.add('hidden');
  try{ document.body.classList.remove('modal-open'); }catch(e){}
  resetVictoryPanel();
  basketTargetX = player.x;
  setParallax();
  slowBadge?.classList.add('hidden');
  fastBadge?.classList.add('hidden');
  requestAnimationFrame(loop);
}
btnMenu?.addEventListener('click',()=>{
  openMainMenu();
});
btnRestart?.addEventListener('click',()=>startGame(diff));
btnPlay.addEventListener('click',()=>{ if(!running) return; paused=!paused; pausedBadge.classList.toggle('hidden',!paused); if(!paused) requestAnimationFrame(loop); });

document.querySelectorAll('[data-action="restart"]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    btnRestart?.click();
  });
});

document.querySelectorAll('[data-action="menu"]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    openMainMenu();
  });
});

document.getElementById('startBtnProxy')?.addEventListener('click', ()=>{
  openMainMenu();
});

function init(){
  try{ document.getElementById('preloader')?.remove(); }catch(e){}

  ensureNick(); resizeCanvas();
  scoreEl.textContent=`🎃 0 / ${TARGET_PUMPKINS}`;
  timerEl.textContent='⏱ 0.0s';
  livesEl.textContent='❤️'.repeat(BASE_LIVES);
  setParallax();
}
init();
setTimeout(()=>{ const pre=document.getElementById('preloader'); if(pre) pre.classList.add('hidden'); },1500);

function showWin(){
  showVictory(performance.now());
}

// start overlay difficulty buttons
document.querySelectorAll('#startOverlay .diff').forEach(btn=>{
  btn.addEventListener('click', ()=>{ document.getElementById('startOverlay')?.classList.add('hidden'); startGame(btn.getAttribute('data-diff')); });
});

function formatTime(seconds){
  const total = Math.max(0, seconds||0);
  const m = Math.floor(total/60);
  const s = (total - m*60).toFixed(1).padStart(4,'0');
  return m>0 ? `${m}м ${s}с` : `${s}с`;
}

function loadStats(){
  try{ const raw = localStorage.getItem('pumpkin_stats'); return raw?JSON.parse(raw):{best:{},attempts:{},sumTime:{}}; }
  catch(e){ return {best:{},attempts:{},sumTime:{}}; }
}
function saveStats(s){ try{ localStorage.setItem('pumpkin_stats', JSON.stringify(s)); }catch(e){} }
function recordAttempt(diff, seconds){
  const key = normalizeDifficulty(diff);
  const s = loadStats();
  s.attempts[key] = (s.attempts[key]||0)+1;
  s.sumTime[key] = (s.sumTime[key]||0)+seconds;
  if(!s.best[key] || seconds < s.best[key]) s.best[key] = seconds;
  saveStats(s); return s;
}
function renderRecords(){
  const s = loadStats();
  const diffs = ['easy','normal','hard','expert'];
  let html = '<table><thead><tr><th>Сложность</th><th>Лучшее</th><th>Попыток</th><th>Среднее</th></tr></thead><tbody>';
  for(const d of diffs){
    const best = s.best[d]; const att = s.attempts[d]||0; const avg = att? (s.sumTime[d]/att): null;
    html += `<tr><td>${DIFF_LABELS[d]||d}</td><td>${best?formatTime(best):'—'}</td><td>${att}</td><td>${avg?formatTime(avg):'—'}</td></tr>`;
  }
  html += '</tbody></table>';
  const node = document.getElementById('recordsBody'); if(node) node.innerHTML = html;
  renderLeaderboard();
}
try{
  document.getElementById('btnShareGame')?.addEventListener('click', async ()=>{
    const btn = document.getElementById('btnShareGame');
    if(!btn) return;
    const originalLabel = btn.textContent || 'Поделиться игрой';
    btn.disabled = true;
    const link = shareBaseLink();
    try{
      await openShareOverlay();
      if(navigator.clipboard){
        await navigator.clipboard.writeText(link);
        btn.textContent = 'Ссылка скопирована!';
      } else {
        window.prompt('Скопируйте ссылку на игру:', link);
        btn.textContent = 'Скопируйте ссылку!';
      }
    }catch(err){
      window.prompt('Скопируйте ссылку на игру:', link);
      btn.textContent = 'Скопируйте ссылку!';
    } finally {
      setTimeout(()=>{
        if(btn){
          btn.textContent = originalLabel;
          btn.disabled = false;
        }
      }, 2200);
    }
  });
  document.getElementById('btnCloseRecords')?.addEventListener('click', ()=>{ document.getElementById('recordsOverlay')?.classList.add('hidden'); });
  document.getElementById('btnResetRecords')?.addEventListener('click', ()=>{ try{ localStorage.removeItem('pumpkin_stats'); }catch(e){} renderRecords(); });
}catch(e){}

let shareOverlay = null;
let sharePreviewText = null;
let shareLinkEl = null;
let sharePreviewImage = null;
let sharePreviewAnchor = null;
let btnCopyShare = null;
let btnCloseShare = null;
let highlightedShareTarget = null;

function ensureShareElements(wire=false){
  shareOverlay = document.getElementById('shareOverlay');
  sharePreviewText = document.getElementById('sharePreviewText');
  shareLinkEl = document.getElementById('shareLink');
  sharePreviewImage = document.getElementById('sharePreviewImage');
  sharePreviewAnchor = document.getElementById('sharePreviewAnchor');
  btnCopyShare = document.getElementById('btnCopyShare');
  btnCloseShare = document.getElementById('btnCloseShare');
  if(!wire) return;
  if(btnCopyShare && !btnCopyShare.__wired){
    btnCopyShare.addEventListener('click', async ()=>{
      ensureShareElements();
      const payload = buildSharePayload();
      const combined = `${payload.text}\n${payload.link}`;
      if (navigator.clipboard){
        try{
          await navigator.clipboard.writeText(combined);
          btnCopyShare.textContent = 'Скопировано!';
          setTimeout(()=>{ if(btnCopyShare) btnCopyShare.textContent = '📋 Скопировать'; }, 1600);
        }catch(e){
          alert(combined);
        }
      } else {
        alert(combined);
      }
    });
    btnCopyShare.__wired = true;
  }
  if(btnCloseShare && !btnCloseShare.__wired){
    btnCloseShare.addEventListener('click', ()=> closeShareOverlay());
    btnCloseShare.__wired = true;
  }
  if(shareOverlay && !shareOverlay.__wiredBackdrop){
    shareOverlay.addEventListener('click', e=>{ if (e.target === shareOverlay) closeShareOverlay(); });
    shareOverlay.__wiredBackdrop = true;
  }
  document.querySelectorAll('[data-share-target]').forEach(btn=>{
    if(btn && !btn.__wired){
      btn.addEventListener('click', async ()=>{
        const target = btn.dataset.shareTarget;
        await openShareOverlay(target);
      });
      btn.__wired = true;
    }
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', ()=>ensureShareElements(true), { once:true });
} else {
  ensureShareElements(true);
}

function shareButtonsList(){
  return Array.from(document.querySelectorAll('[data-share-target]'));
}

function shareBaseLink(){
  try{
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
  }catch(e){
    return window.location.href;
  }
}

const SHARE_IMAGE_PATH = 'banner.png';
let shareImageUrlCache = '';
let shareImageFilePromise = null;

function getShareImageUrl(){
  if(shareImageUrlCache) return shareImageUrlCache;
  try{
    shareImageUrlCache = new URL(SHARE_IMAGE_PATH, window.location.href).toString();
  }catch(e){
    shareImageUrlCache = SHARE_IMAGE_PATH;
  }
  return shareImageUrlCache;
}

async function loadShareImageFile(){
  if(shareImageFilePromise) return shareImageFilePromise;
  if(typeof fetch !== 'function' || typeof File !== 'function'){
    shareImageFilePromise = Promise.resolve(null);
    return shareImageFilePromise;
  }
  shareImageFilePromise = fetch(SHARE_IMAGE_PATH)
    .then(res=>{ if(!res.ok) throw new Error('image load failed'); return res.blob(); })
    .then(blob=>{
      const type = blob.type || 'image/png';
      return new File([blob], 'banner.png', { type });
    })
    .catch(()=>null);
  return shareImageFilePromise;
}

async function buildShareFiles(){
  const file = await loadShareImageFile();
  return file ? [file] : [];
}

function buildSharePayload(){
  const fallbackNick = resolveNick();
  const stats = lastWinStats || {
    seconds: Math.max(0, elapsedMs/1000),
    mode: currentDiff||diff||'normal',
    modeLabel: DIFF_LABELS[currentDiff||diff||'normal'] || (currentDiff||diff||'normal'),
    nick: fallbackNick
  };
  const nick = (stats.nick || '').trim() || fallbackNick;
  const displayName = nick;
  const modeLabel = stats.modeLabel || DIFF_LABELS[stats.mode] || stats.mode || 'Норм';
  const seconds = Number.isFinite(stats.seconds) ? stats.seconds : Math.max(0, elapsedMs/1000);
  const timeText = formatTime(seconds);
  const link = shareBaseLink();
  const gameTitle = 'Hi, Halloween: Pumpkin Catcher!';
  const imageUrl = getShareImageUrl();
  const shareLines = [
    `Никнейм: ${displayName}`,
    `Уровень сложности: ${modeLabel}`,
    `Результат по времени: ${timeText}`,
    'Готовься к Хэллоуину вместе с нами! Узнай, а на что способен ты?'
  ];
  const text = shareLines.join('\n');
  return { text, link, nick: displayName, modeLabel, timeText, gameTitle, imageUrl };
}

function showShareOverlay(payload){
  ensureShareElements();
  const data = payload || buildSharePayload();
  if(sharePreviewText){
    const safe = escapeHtml(data.text).replace(/\n/g,'<br>');
    sharePreviewText.innerHTML = safe;
  }
  if(shareLinkEl){
    shareLinkEl.textContent = data.link;
    shareLinkEl.href = data.link;
  }
  if(sharePreviewAnchor){
    const href = data.link || shareBaseLink();
    sharePreviewAnchor.href = href;
    sharePreviewAnchor.target = '_blank';
    sharePreviewAnchor.rel = 'noopener noreferrer';
  }
  if(sharePreviewImage){
    const url = data.imageUrl || getShareImageUrl();
    if(url){
      sharePreviewImage.src = url;
      sharePreviewImage.alt = data.gameTitle || 'Hi, Halloween: Pumpkin Catcher!';
      sharePreviewImage.classList.remove('hidden');
    }
  }
  if(shareOverlay){
    shareOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
  return data;
}

async function shareResult(){
  const btn = document.getElementById('btnShare');
  const originalLabel = btn?.textContent || 'Поделиться';
  if(btn){
    btn.disabled = true;
    btn.classList.add('sharing');
    btn.textContent = 'Готовим ссылку…';
  }
  const payload = showShareOverlay(buildSharePayload());
  highlightShare(null);
  const combined = `${payload.text}\n${payload.link}`;
  const shareFiles = await buildShareFiles();
  let shared = false;
  try{
    if(navigator.share){
      const shareData = { title: payload.gameTitle || 'Hi Halloween — Pumpkin Catcher', text: payload.text, url: payload.link };
      if(shareFiles.length && navigator.canShare && navigator.canShare({ files: shareFiles })){
        shareData.files = shareFiles;
      }
      await navigator.share(shareData);
      if(btn) btn.textContent = 'Поделились!';
      shared = true;
    } else if(navigator.clipboard){
      await navigator.clipboard.writeText(combined);
      if(btn) btn.textContent = 'Скопировано!';
      shared = true;
    } else {
      window.prompt('Скопируйте ссылку и поделитесь результатом:', combined);
      if(btn) btn.textContent = 'Скопируй ссылку!';
      shared = true;
    }
  }catch(err){
    if(err && err.name === 'AbortError'){
      if(btn) btn.textContent = originalLabel;
    } else {
      try{
        if(navigator.clipboard){
          await navigator.clipboard.writeText(combined);
          if(btn) btn.textContent = 'Скопировано!';
        } else {
          window.prompt('Скопируйте ссылку и поделитесь результатом:', combined);
          if(btn) btn.textContent = 'Скопируй ссылку!';
        }
        shared = true;
      }catch(_){
        window.prompt('Скопируйте ссылку и поделитесь результатом:', combined);
        if(btn) btn.textContent = 'Скопируй ссылку!';
        shared = true;
      }
    }
  } finally {
    if(btn){
      setTimeout(()=>{
        btn.textContent = originalLabel;
        btn.disabled = false;
        btn.classList.remove('sharing');
      }, shared ? 2200 : 600);
    }
  }
  return payload;
}

function highlightShare(target){
  highlightedShareTarget = target || null;
  shareButtonsList().forEach(btn => btn.classList.toggle('active', target ? btn.dataset.shareTarget === target : false));
}

async function openShareOverlay(target){
  const payload = showShareOverlay();
  highlightShare(target||null);
  if(target){
    const url = shareUrlFor(target, payload);
    if(url){ window.open(url, '_blank', 'noopener'); }
  }
  return payload;
}

function closeShareOverlay(){
  if (shareOverlay){ shareOverlay.classList.add('hidden'); }
  document.body.classList.remove('modal-open');
  highlightShare(null);
}

function shareUrlFor(target, payload){
  const { text, link, imageUrl } = payload;
  if (target === 'telegram'){
    return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  }
  if (target === 'whatsapp'){
    return `https://wa.me/?text=${encodeURIComponent(text + '\n' + link)}`;
  }
  if (target === 'vk'){
    const title = 'Hi Halloween — Pumpkin Catcher';
    let url = `https://vk.com/share.php?url=${encodeURIComponent(link)}&title=${encodeURIComponent(title)}&comment=${encodeURIComponent(text)}`;
    if(imageUrl){
      url += `&image=${encodeURIComponent(imageUrl)}`;
    }
    return url;
  }
  return null;
}

function openShareTarget(target){
  openShareOverlay(target);
}

document.getElementById('btnShare')?.addEventListener('click', ()=>{ shareResult(); });

let cachedNick = '';
function loadNick(){
  try{
    const raw = localStorage.getItem('pumpkin_nick') || '';
    const trimmed = (raw || '').trim();
    if(trimmed) cachedNick = trimmed;
    return raw;
  }catch(e){
    return cachedNick || '';
  }
}
function saveNick(v){
  const trimmed = (v||'').trim();
  cachedNick = trimmed;
  try{ localStorage.setItem('pumpkin_nick', trimmed); }catch(e){}
}
function resolveNick(){
  if(cachedNick) return cachedNick;
  const saved = (loadNick() || '').trim();
  if(saved){
    cachedNick = saved;
    return saved;
  }
  const inputVal = (document.getElementById('nickInput')?.value || '').trim();
  if(inputVal){
    cachedNick = inputVal;
    return inputVal;
  }
  return 'Игрок';
}
function ensureNick(){
  const saved = (loadNick() || '').trim();
  const inp = document.getElementById('nickInput');
  if(saved){
    cachedNick = saved;
    if(inp) inp.value = saved;
    return;
  }
  if(inp && cachedNick){
    inp.value = cachedNick;
  }
  document.getElementById('nickOverlay')?.classList.remove('hidden');
  document.body.classList.add('modal-open');
  try{ inp && inp.focus(); }catch(e){}
}
try{
  document.getElementById('btnSaveNick')?.addEventListener('click', ()=>{
    const v = (document.getElementById('nickInput')?.value||'').trim();
    if(v){
      saveNick(v);
      document.getElementById('nickOverlay')?.classList.add('hidden');
      document.body.classList.remove('modal-open');
      try{
        if (!running) {
          const sel = document.getElementById('difficulty');
          const mode = (currentDiff || sel?.value || 'normal');
          startGame(mode);
        }
      }catch(_){}
    }
  });
  // Enter to save nickname
  (function(){ const inp = document.getElementById('nickInput'); if(inp){ inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); document.getElementById('btnSaveNick')?.click(); } }); } })();
  document.getElementById('btnSkipNick')?.addEventListener('click', ()=>{
    document.getElementById('nickOverlay')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
    try{
      if (!running) {
        const sel = document.getElementById('difficulty');
        const mode = (currentDiff || sel?.value || 'normal');
        startGame(mode);
      }
    }catch(_){}
  });
}catch(e){}

function loadLeaderboard(){
  try{ const raw = localStorage.getItem('pumpkin_lb'); return raw?JSON.parse(raw):[]; }
  catch(e){ return []; }
}
function saveLeaderboard(lb){
  try{ localStorage.setItem('pumpkin_lb', JSON.stringify(lb.slice(-100))); }catch(e){}
}
// record format: { nick, diff, seconds, ts }
function pushLeaderboard(nick, diff, seconds){
  const lb = loadLeaderboard();
  const cleanNick = (nick || '').trim();
  const finalNick = getRecordDisplayNick({ nick: cleanNick });
  const key = normalizeDifficulty(diff);
  const entry = { nick: finalNick, diff: key, seconds, ts: Date.now() };
  lb.push(entry);
  saveLeaderboard(lb);
  lastLeaderboardEntry = entry;
  return entry;
}
function renderLeaderboard(){
  const all = loadLeaderboard();
  const node = document.getElementById('lbBody');
  if(!node) return;
  if(!all.length){
    node.innerHTML = '<p class="empty">Пока пусто.</p>';
    return;
  }
  const html = buildLeaderboardMarkup(all, lastLeaderboardEntry, {
    limit: LEADERBOARD_DISPLAY_LIMIT,
    recentLimit: RECENT_LEADERBOARD_LIMIT,
    bestTitle: 'Топ игроков',
    recentTitle: 'Последние 8 игр',
    bestEmptyText: 'Нет записей',
    recentEmptyText: 'Ещё никто не играл'
  });
  node.innerHTML = html;
}

let CONFETTI = []; let CONFETTI_UNTIL = 0;
function confettiKick(){
  const now = performance.now();
  CONFETTI_UNTIL = now + 2000;
  const colors = ['#ff8a2b','#ffd166','#06d6a0','#118ab2','#ef476f','#ffffff'];
  const N = 80;
  for(let i=0;i<N;i++){
    CONFETTI.push({
      x: Math.random()*W, y: -10 - Math.random()*H*0.2,
      vx: (Math.random()*2-1)*1.2, vy: Math.random()*2+1.5,
      r: Math.random()*6+3, c: colors[(Math.random()*colors.length)|0],
      rot: Math.random()*Math.PI*2, vr: (Math.random()*2-1)*0.15
    });
  }
}
function updateConfetti(dt){
  const now = performance.now();
  if (now > CONFETTI_UNTIL && CONFETTI.length===0) return;
  // update
  for(const p of CONFETTI){
    p.x += p.vx * dt * 0.06;
    p.y += p.vy * dt * 0.06;
    p.vy += 0.02;
    p.rot += p.vr * dt * 0.06;
  }
  // cull off-screen
  CONFETTI = CONFETTI.filter(p=> p.y < H + 40);
}
function drawConfetti(){
  if (CONFETTI.length===0) return;
  ctx.save();
  for(const p of CONFETTI){
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.r*0.5, -p.r*0.2, p.r, p.r*0.4);
    ctx.setTransform(1,0,0,1,0,0);
  }
  ctx.restore();
}

// ensure start buttons start immediately
document.querySelectorAll('#startOverlay .diff').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById('startOverlay')?.classList.add('hidden');
    try{ document.getElementById('preloader')?.remove(); }catch(e){}
    startGame(btn.getAttribute('data-diff'));
  });
});


// ===== START MODAL WIRING (root deploy) =====
(function(){
  const startOverlay = document.getElementById('startOverlay');
  if (!startOverlay) return;

  function openStart(){
    startOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
  function closeStart(){
    startOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }
  function run(diff){
    try{ document.getElementById('preloader')?.remove(); }catch(_){}
    closeStart();
    try{ startGame(diff || 'normal'); }catch(e){ console.error('startGame error:', e); }
  }

  // explicit handlers

// --- safety: attach direct click handlers for difficulty buttons if any ---
(function(){ try{
  var st = document.getElementById('startOverlay');
  if(!st) return;
  ['easy','normal','hard','expert'].forEach(function(key){
    var el = st.querySelector('[data-diff="'+key+'"]');
    if (el) {
      el.onclick = function(e){
        e.preventDefault(); e.stopPropagation();
        try{ startGame(key); }catch(err){ console.error('startGame failed', err); }
        try{ st.classList.add('hidden'); document.body.classList.remove('modal-open'); }catch(e){}
      };
    }
  });
}catch(e){ console.warn('difficulty safety handlers failed', e); }})();

  startOverlay.querySelectorAll('[data-diff]').forEach(btn=>{
    btn.type='button';
    btn.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); run(btn.dataset.diff); };
  });

  // delegated safety
  startOverlay.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-diff]');
    if (el){ e.preventDefault(); e.stopPropagation(); run(el.dataset.diff); }
  });

  // stop pointer leaking to canvas under modal
  ['pointerdown','pointerup','click','touchstart'].forEach(ev=>{
    startOverlay.addEventListener(ev, e=> e.stopPropagation());
  });

  let shouldOpen = false;

  function requestInitialOpen(){
    shouldOpen = true;
    if (introFinished){
      openStart();
      shouldOpen = false;
    }
  }

  document.addEventListener('introFinished', ()=>{
    if (shouldOpen){
      openStart();
      shouldOpen = false;
    }
  });

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ requestInitialOpen(); }, { once:true });
  } else { requestInitialOpen(); }
})();


try{ document.addEventListener('DOMContentLoaded', init, {once:true}); }catch(e){ try{ init(); }catch(_e){} }
