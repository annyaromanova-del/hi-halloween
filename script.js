const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;
let running=false, paused=false;
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const startOverlay = document.getElementById('startOverlay');
const messageOverlay = document.getElementById('messageOverlay');
const scoreEl = document.getElementById('score'); const timerEl=document.getElementById('timer'); const livesEl=document.getElementById('lives');
const btnPlay = document.getElementById('btnPlay'); const btnVol=document.getElementById('btnVol'); const bgm=document.getElementById('bgm');

// Simple demo gameplay so scaffold runs
const player={w:140,h:24,x:(W-140)/2,y:H-34};
let objects=[], score=0, lives=3, last=0, startT=0;
function spawn(){ const types=['pumpkin','spider','candy','ghost','web']; const t=types[(Math.random()*types.length)|0]; objects.push({t,x:Math.random()*(W-40)+20,y:-20,vy:2+Math.random()*2}); }
function drawPlayer(){ ctx.fillStyle='#2a2c5f'; round(player.x,player.y,player.w,player.h,10); ctx.fill(); ctx.fillStyle='#ff9a3a'; ctx.font='bold 13px system-ui,Arial'; ctx.textAlign='center'; ctx.fillText('ОНЛАЙНТРЕЙД.РУ', player.x+player.w/2, player.y+player.h/2+4); }
function round(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function loop(ts){ if(!last) last=ts; const dt=ts-last; last=ts; if(Math.random()<0.02) spawn(); update(dt,ts); render(); if(running && !paused) requestAnimationFrame(loop); }
function update(dt,ts){ objects=objects.filter(o=>{ o.y+=o.vy; if(coll(o,player)) { if(o.t==='pumpkin') score++; else lives=Math.max(0,lives-1); return false;} return o.y<H+30; }); scoreEl.textContent=`🎃 ${score} / 100`; timerEl.textContent=`⏱ ${((ts-startT)/1000).toFixed(1)}s`; livesEl.textContent='❤️'.repeat(lives)+'🤍'.repeat(3-lives); if(score>=100){ win(ts); } if(lives<=0){ lose(); } }
function coll(o,b){ const r=14, cx=Math.max(b.x,Math.min(o.x,b.x+b.w)), cy=Math.max(b.y,Math.min(o.y,b.y+b.h)); const dx=o.x-cx,dy=o.y-cy; return dx*dx+dy*dy <= r*r; }
function render(){ ctx.clearRect(0,0,W,H); drawPlayer(); objects.forEach(o=>{ ctx.save(); ctx.fillStyle = o.t==='pumpkin'?'#ff9a3a': o.t==='spider'?'#d33': o.t==='candy'?'#f6a': o.t==='ghost'?'#e7f0ff':'#c7d8ff'; ctx.beginPath(); ctx.arc(o.x,o.y,12,0,Math.PI*2); ctx.fill(); ctx.restore(); }); }
function win(ts){ running=false; document.getElementById('msgTitle').textContent='Победа!'; document.getElementById('msgText').textContent=`Ты собрал 100 тыкв за ${((ts-startT)/1000).toFixed(2)}s!`; messageOverlay.classList.remove('hidden'); }
function lose(){ running=false; document.getElementById('msgTitle').textContent='Игра окончена'; document.getElementById('msgText').textContent='Жизни закончились. Попробуй ещё раз!'; messageOverlay.classList.remove('hidden'); }
btnStart.addEventListener('click', ()=>{ score=0;lives=3;objects=[];startT=performance.now();startOverlay.classList.add('hidden');messageOverlay.classList.add('hidden');running=true;paused=false;last=0;requestAnimationFrame(loop); });
btnRestart.addEventListener('click', ()=> btnStart.click());
canvas.addEventListener('pointerdown', e=>{ const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*(canvas.width/r.width); player.x=Math.max(0,Math.min(W-player.w,x-player.w/2)); });
canvas.addEventListener('pointermove', e=>{ if(e.buttons){ const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*(canvas.width/r.width); player.x=Math.max(0,Math.min(W-player.w,x-player.w/2)); } });
btnPlay.addEventListener('click', ()=>{ if(!running) return; paused=!paused; if(!paused) requestAnimationFrame(loop); });

// Audio: local-first, then remote (stream)
(function setupAudio(){
  if(!bgm) return;
  const playlist=[
    {local:'assets/audio/horroriffic.mp3', remote:'https://freepd.com/music/Horroriffic.mp3'},
    {local:'assets/audio/ghostpocalypse.mp3', remote:'https://freepd.com/music/Ghostpocalypse.mp3'},
    {local:'assets/audio/come_play_with_me.mp3', remote:'https://freepd.com/music/Come%20Play%20With%20Me.mp3'},
    {local:'assets/audio/night_of_chaos.mp3', remote:'https://freepd.com/music/Night%20of%20Chaos.mp3'}
  ];
  let i=Math.floor(Math.random()*playlist.length);
  function setTrack(idx){ i=(idx+playlist.length)%playlist.length; const s=playlist[i]; bgm.src=s.local; const onErr=()=>{ bgm.removeEventListener('error', onErr); bgm.src=s.remote; }; bgm.addEventListener('error', onErr, { once:true }); }
  setTrack(i); bgm.loop=false; bgm.addEventListener('ended', ()=> setTrack(i+1));
  function setVolIcon(){ btnVol.textContent = bgm.muted ? '🔇' : '🔊'; } setVolIcon();
  btnVol.addEventListener('click', ()=>{ bgm.muted=!bgm.muted; setVolIcon(); });
  // do NOT autoplay here; unlock on first user gesture (SAFE patch below)
})();

// === SAFE MODE quick patch ===
const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
(function setupDebugOverlay(){
  if(!DEBUG) return;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:92vw;max-height:45vh;overflow:auto;background:rgba(0,0,0,.7);color:#fff;padding:8px 10px;border:1px solid #fff3;border-radius:8px;font:12px/1.35 ui-monospace,Menlo,Consolas;z-index:9999;white-space:pre-wrap';
  box.textContent = '[debug] enabled';
  document.body.appendChild(box);
  const log = m => box.textContent += '\\n' + m;
  window.addEventListener('error', e=> log('[error] ' + (e.message||e.filename||'unknown')));
  window.addEventListener('unhandledrejection', e=> log('[promise] ' + (e.reason&&e.reason.message||e.reason||'unknown')));
})();
// Force-hide preloader after 1.5s
(function(){ const pre=document.getElementById('preloader'); if(pre){ setTimeout(()=> pre.classList.add('hidden'), 1500); } })();
// Unlock audio on first gesture only
(function(){ const bgm=document.getElementById('bgm'); if(!bgm) return; ['pointerdown','click','touchstart','keydown'].forEach(ev=>window.addEventListener(ev, ()=>{ if (bgm.src) bgm.play().catch(()=>{}); }, { once:true, passive:true })); })();
// Sprite fallback stub
window.SPRITES = window.SPRITES || {};
