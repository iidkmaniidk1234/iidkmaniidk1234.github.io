(() => {
  const menu=document.getElementById('start'),canvas=document.getElementById('galaxy-canvas'),ctx=canvas.getContext('2d',{alpha:true});
  const backdrop=document.querySelector('.galaxy-backdrop'),button=document.getElementById('background-toggle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const car=new Image();car.src='/media/drift-car.svg';
  const photograph=document.getElementById('galaxy-photo');
  let width=0,height=0,dpr=1,stars=[],sparks=[],smoke=[],tracks=[],paused=reduced.matches,raf=0,last=0,clock=1.5,lastPointer=0;
  let base=document.createElement('canvas');
  function sprite(color){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,31);r.addColorStop(0,color);r.addColorStop(.13,color);r.addColorStop(.4,color.replace('1)', '.25)'));r.addColorStop(1,color.replace('1)', '0)'));g.fillStyle=r;g.fillRect(0,0,64,64);return c;}
  const glow=sprite('rgba(156,198,255,1)'),pink=sprite('rgba(203,150,255,1)'),cloud=sprite('rgba(144,158,209,1)');
  function visible(){return !menu.hidden&&!document.hidden;}
  function resize(){
    const content=menu.querySelector('.start-content'),style=getComputedStyle(menu);
    width=menu.clientWidth;height=Math.max(menu.clientHeight,content.offsetHeight+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom));
    if(!width||!height)return;
    dpr=Math.min(devicePixelRatio||1,1.35,1600/width);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.height=height+'px';backdrop.style.height=height+'px';
    base.width=canvas.width;base.height=canvas.height;
    const bg=base.getContext('2d');bg.setTransform(dpr,0,0,dpr,0,0);
    let seed=71;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    stars=Array.from({length:Math.min(300,Math.round(width*height/3500))},()=>({x:rand()*width,y:rand()*height,r:.5+rand()*1.1,a:.18+rand()*.55,glow:0,color:rand()>.7?pink:glow}));
    for(const s of stars){bg.globalAlpha=s.a;bg.fillStyle='#dbe7ff';bg.beginPath();bg.arc(s.x,s.y,s.r,0,Math.PI*2);bg.fill();}
    smoke=[];tracks=[];render();wake();
  }
  function updateButton(){button.textContent=paused?'Play motion':'Pause motion';button.setAttribute('aria-label',(paused?'Play':'Pause')+' drifting car animation');button.setAttribute('aria-pressed',String(paused));}
  function interact(event){
    if(!visible())return;const now=performance.now();if(now-lastPointer<18)return;lastPointer=now;
    const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;
    for(const s of stars){const d=Math.hypot(x-s.x,y-s.y);if(d<110)s.glow=Math.max(s.glow,1-d/135);}
    if(sparks.length<55){sparks.push({x,y,life:1,r:2+Math.random()*2});if(!reduced.matches)sparks.push({x:x+(Math.random()-.5)*25,y:y+(Math.random()-.5)*25,life:.8,r:1.5});}
    wake();
  }
  menu.addEventListener('pointermove',interact,{passive:true});menu.addEventListener('pointerdown',interact,{passive:true});
  function carPose(){
    const compact=width<650;
    const stage=document.getElementById('car-stage').getBoundingClientRect(),bounds=canvas.getBoundingClientRect();
    const cx=stage.left-bounds.left+stage.width/2,cy=stage.top-bounds.top+stage.height/2;
    const rx=Math.min(compact?70:100,stage.width*.2),ry=compact?23:28;
    const t=clock*.72,x=cx+Math.cos(t)*rx,y=cy+Math.sin(t)*ry;
    const angle=Math.atan2(Math.cos(t)*ry,-Math.sin(t)*rx)+.55;
    return{x,y,angle,size:compact?180:220,cx,cy,rx,ry};
  }
  function render(){
    if(!width||!height)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(base,0,0,width,height);
    let activeStars=0;
    for(const s of stars)if(s.glow>.018){activeStars++;const n=15+s.glow*32;ctx.globalAlpha=s.glow*.85;ctx.drawImage(s.color,s.x-n/2,s.y-n/2,n,n);ctx.globalAlpha=s.glow;ctx.fillStyle='#eff5ff';ctx.fillRect(s.x-1,s.y-1,2,2);if(s.glow>.45){ctx.strokeStyle='#d9e6ff';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(s.x-4*s.glow,s.y);ctx.lineTo(s.x+4*s.glow,s.y);ctx.moveTo(s.x,s.y-4*s.glow);ctx.lineTo(s.x,s.y+4*s.glow);ctx.stroke();}}
    for(const p of sparks){ctx.globalAlpha=p.life*.7;const n=p.r*(5+8*(1-p.life));ctx.drawImage(glow,p.x-n/2,p.y-n/2,n,n);}
    const p=carPose();ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(158,157,247,.08)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.cx,p.cy,p.rx+12,p.ry+14,0,0,Math.PI*2);ctx.stroke();
    for(let i=1;i<tracks.length;i++){const a=tracks[i-1],b=tracks[i];ctx.strokeStyle=`rgba(130,174,255,${b.life*.15})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(const q of smoke){const n=q.size*(2-q.life);ctx.globalAlpha=q.life*.23;ctx.drawImage(cloud,q.x-n/2,q.y-n/2,n,n);}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=.6;ctx.drawImage(pink,-p.size*.63,-p.size*.38,p.size*1.26,p.size*.76);ctx.globalAlpha=1;
    if(car.complete&&car.naturalWidth)ctx.drawImage(car,-p.size/2,-p.size/4,p.size,p.size/2);
    ctx.restore();ctx.globalAlpha=1;
    canvas.dataset.activeStars=String(activeStars);canvas.dataset.sparks=String(sparks.length);canvas.dataset.running=String(visible()&&!paused);
  }
  function tick(now){
    raf=0;if(!visible())return;
    if(now-last<32){raf=requestAnimationFrame(tick);return;}
    const dt=Math.min(.06,(now-(last||now))/1000);last=now;
    for(const s of stars)s.glow*=Math.exp(-dt*2.25);
    sparks=sparks.filter(p=>{p.life-=dt*1.1;return p.life>0;});
    if(!paused){
      clock+=dt;const p=carPose(),rear=p.size*.3;
      if(smoke.length<42){const side=(Math.random()>.5?1:-1)*p.size*.13;smoke.push({x:p.x-Math.cos(p.angle)*rear-Math.sin(p.angle)*side,y:p.y-Math.sin(p.angle)*rear+Math.cos(p.angle)*side,life:1,size:24+Math.random()*20,dx:(Math.random()-.5)*17,dy:-6-Math.random()*8});}
      tracks.push({x:p.x-Math.cos(p.angle)*rear,y:p.y-Math.sin(p.angle)*rear,life:1});if(tracks.length>80)tracks.shift();
      smoke=smoke.filter(q=>{q.life-=dt*.65;q.x+=q.dx*dt;q.y+=q.dy*dt;return q.life>0;});
      for(const a of tracks)a.life=Math.max(0,a.life-dt*.5);
    }
    render();
    if(!paused||sparks.length||stars.some(s=>s.glow>.018))raf=requestAnimationFrame(tick);
  }
  function wake(){if(visible()&&!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
  function sync(){if(!visible()){cancelAnimationFrame(raf);raf=0;canvas.dataset.running='false';}else{resize();wake();}updateButton();}
  button.onclick=()=>{paused=!paused;updateButton();render();wake();};
  reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
  new MutationObserver(sync).observe(menu,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',sync);
  let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(visible())resize();},80);}).observe(menu);
  car.onload=()=>{render();wake();};
  window.bash?.preview?.onCapture(async({capture,signal})=>{await Promise.race([Promise.allSettled([car.decode(),photograph.decode()]),new Promise(r=>setTimeout(r,1200))]);if(signal.aborted)return;render();capture();});
  updateButton();resize();
})();
