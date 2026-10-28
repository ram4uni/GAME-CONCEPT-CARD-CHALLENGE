(() => {
  'use strict';
  const steps = [
    ['Genre', 'GENRE'], ['TargetAudience','TARGET AUDIENCE'],
    ['CoreMechanic','CORE MECHANIC'], ['VisualStyle','VISUAL STYLE'],
    ['SpecialConstraint','SPECIAL CONSTRAINT']
  ];
  const panels = ['welcome','round','results','ready','timer'];
  const $ = id => document.getElementById(id);
  let round = 0;
  let chosen = [];
  let eightCards = [];
  let picked = false;

  // Remaining seconds are calculated from an absolute real-time deadline,
  // not by subtracting one each interval (which drifts in inactive tabs).
  let timerDurationSeconds = 15 * 60;
  let timerRemainingSeconds = timerDurationSeconds;
  let timerDeadline = null;
  let timerInterval = null;
  let timerState = 'idle'; // idle, running, paused, finished
  const now = () => Date.now();
  // Local, one-shot completion sound. No sound is played while counting down.
  const finishAudio = typeof Audio === 'function' ? new Audio('timer-finish.wav') : null;
  if (finishAudio) finishAudio.preload = 'auto';
  let finishSoundPlayed = false;
  function stopFinishSound(){
    if(finishAudio){finishAudio.pause();finishAudio.currentTime = 0;}
    finishSoundPlayed = false;
  }
  function playFinishSound(){
    if(finishSoundPlayed)return;
    finishSoundPlayed = true;
    if(!finishAudio)return;
    finishAudio.currentTime = 0;
    finishAudio.play().catch(()=>{
      $('timer-sound-note').textContent = 'Sound was blocked by your browser. Check your audio settings.';
    });
  }

  function show(id) { panels.forEach(p => $(p).classList.toggle('hidden',p !== id)); }
  function shuffle(values) {
    const a = [...values];
    for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function imageSrc(category,file) { return 'CardImages/'+encodeURIComponent(category)+'/'+encodeURIComponent(file); }
  function el(tag,css,text){const n=document.createElement(tag); if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;}
  function start(){
    stopTicker();stopFinishSound();
    chosen=[];round=0;
    if(!Array.isArray(window.OPEN_DAY_CARDS?.Genre)||!window.OPEN_DAY_CARDS.Genre.length){
      $('start').insertAdjacentText('afterend',' Card data did not load. Please reload the page.');
      return;
    }
    setupRound();
    resetTimerState();
  }
  function setupRound(){
    picked=false;
    const [category,label] = steps[round];
    const deck = window.OPEN_DAY_CARDS?.[category] || [];
    eightCards=shuffle(deck).slice(0,8);
    $('round-number').textContent=`ROUND ${round+1} OF 5`;
    $('round-title').textContent=`CHOOSE YOUR ${label}`;
    $('chosen-message').textContent='PICK ANY ONE CARD';
    $('next').disabled=true;
    $('next').innerHTML=(round===4?'REVEAL FINAL CHALLENGE':'NEXT ROUND')+' <span>→</span>';
    $('past-choices').textContent=chosen.map((entry,i)=>steps[i][1]+': '+entry.label).join('   /   ');
    const grid=$('card-grid');grid.replaceChildren();
    eightCards.forEach((card,i)=>{
      const button=el('button','flip-card');
      button.type='button';button.setAttribute('aria-label',`Reveal mystery card ${i+1}`);
      const inner=el('span','inner');
      const back=el('span','card-back');
      back.append(el('span','sigil','✦'),el('span','number',String(i+1).padStart(2,'0')),el('span','mystery','MYSTERY CARD'));
      const front=el('span','card-front');
      const img=document.createElement('img');img.src=imageSrc(category,card.file);img.alt=card.label;img.loading='eager';
      front.append(img);inner.append(back,front);button.append(inner);
      button.addEventListener('click',()=>selectCard(i));grid.append(button);
    });
    show('round');
  }
  function selectCard(index){
    if(picked)return;
    picked=true;chosen.push(eightCards[index]);
    const all=[...$('card-grid').children];
    all.forEach((card,i)=>{card.disabled=true;if(i!==index)card.classList.add('dimmed');});
    const pickedCard=all[index];pickedCard.classList.add('revealed','picked');
    $('chosen-message').textContent='REVEALING YOUR CHOICE…';
    window.setTimeout(()=>{
      $('chosen-message').textContent=`YOU SELECTED: ${eightCards[index].label.toUpperCase()}`;
      $('next').disabled=false;
    },620);
  }
  function next(){
    if(!picked||$('next').disabled)return;
    if(round<steps.length-1){round++;setupRound();return;}
    const result=$('result-cards');result.replaceChildren();
    chosen.forEach((card,i)=>{
      const wrap=el('div','result-card');
      const img=document.createElement('img');img.src=imageSrc(steps[i][0],card.file);img.alt=card.label;
      wrap.append(el('div','category',steps[i][1]),img,el('div','label',card.label));
      result.append(wrap);
    });
    show('results');
  }
  function ready(){
    const holder=$('ready-choices');holder.replaceChildren();
    chosen.forEach((card,i)=>{
      const chip=el('div','ready-chip');
      chip.append(el('strong','',steps[i][1]),document.createTextNode(card.label));
      holder.append(chip);
    });
    show('ready');
  }

  function validMinutes(){
    const minutes=Number($('timer-minutes').value);
    if(!Number.isInteger(minutes)||minutes<1||minutes>180){
      $('timer-help').textContent='Please enter a whole number from 1 to 180.';
      $('timer-minutes').focus();return null;
    }
    $('timer-help').textContent='Enter any whole number from 1 to 180.';
    return minutes;
  }
  function stopTicker(){if(timerInterval!==null){clearInterval(timerInterval);timerInterval=null;}}
  function timeLeft(){return timerState==='running'?Math.max(0,(timerDeadline-now())/1000):timerRemainingSeconds;}
  function formatTime(seconds){
    const total=Math.max(0,Math.ceil(seconds));
    const mins=Math.floor(total/60);
    return `${String(mins).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  }
  function displayTimer(){
    const left=timeLeft();
    if(timerState==='running' && left<=0){
      timerRemainingSeconds=0;timerDeadline=null;timerState='finished';stopTicker();playFinishSound();
    }
    const current=timeLeft();
    const finished=timerState==='finished';
    $('timer-display').textContent=finished?'TIME’S UP!':formatTime(current);
    $('timer-status').textContent={idle:'READY TO START',running:'TIME REMAINING',paused:'TIMER PAUSED',finished:'CHALLENGE COMPLETE — GET READY TO PRESENT!'}[timerState];
    $('timer-toggle').disabled=finished;
    $('timer-toggle').innerHTML={idle:'START TIMER <span>▶</span>',running:'PAUSE TIMER <span>Ⅱ</span>',paused:'RESUME TIMER <span>▶</span>',finished:'TIME’S UP!'}[timerState];
    $('timer-minutes').disabled=timerState==='running'||timerState==='paused';
    document.querySelectorAll('[data-minutes]').forEach(btn=>btn.disabled=timerState==='running'||timerState==='paused');
    $('timer-progress-fill').style.width=(100*Math.min(1,Math.max(0,current/timerDurationSeconds)))+'%';
    document.querySelector('.timer-clock').classList.toggle('finished',finished);
  }
  function resetTimerState(){
    stopTicker();stopFinishSound();$('timer-sound-note').textContent='The timer is silent until it reaches zero. A short finish sound plays once.';timerState='idle';timerDeadline=null;
    const minutes=validMinutes();
    if(minutes===null)return false;
    timerDurationSeconds=minutes*60;timerRemainingSeconds=timerDurationSeconds;
    displayTimer();return true;
  }
  function toggleTimer(){
    if(timerState==='finished')return;
    if(timerState==='running'){
      timerRemainingSeconds=timeLeft();timerDeadline=null;timerState='paused';stopTicker();
    } else if(timerState==='idle'||timerState==='paused'){
      if(timerState==='idle'&&!resetTimerState())return;
      timerDeadline=now()+timerRemainingSeconds*1000;
      timerState='running';
      stopTicker();timerInterval=setInterval(displayTimer,150);
    }
    displayTimer();
  }
  function openTimer(){
    if(timerState==='idle')resetTimerState();
    show('timer');displayTimer();
  }

  $('start').addEventListener('click',start);
  $('next').addEventListener('click',next);
  $('restart').addEventListener('click',()=>{stopTicker();resetTimerState();show('welcome');});
  $('ready-next').addEventListener('click',ready);
  $('back-results').addEventListener('click',()=>show('results'));
  $('open-timer').addEventListener('click',openTimer);
  $('timer-toggle').addEventListener('click',toggleTimer);
  $('timer-reset').addEventListener('click',resetTimerState);
  $('timer-back').addEventListener('click',()=>{displayTimer();show('ready');});
  $('timer-new').addEventListener('click',()=>{stopTicker();resetTimerState();show('welcome');});
  $('timer-minutes').addEventListener('input',()=>{
    if(timerState==='idle'){
      const n=Number($('timer-minutes').value);
      if(Number.isInteger(n)&&n>=1&&n<=180)resetTimerState();
    }
  });
  document.querySelectorAll('[data-minutes]').forEach(button=>button.addEventListener('click',()=>{
    $('timer-minutes').value=button.dataset.minutes;
    if(timerState==='idle'||timerState==='finished')resetTimerState();
  }));
  document.addEventListener('visibilitychange',()=>{if(timerState==='running')displayTimer();});
  displayTimer();
  // Keyboard accessibility: on screen, select a card by clicking or using Tab + Enter.
  show('welcome');
})();
