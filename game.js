(() => {
  'use strict';
  const steps = [
    ['Genre', 'GENRE'], ['TargetAudience','TARGET AUDIENCE'],
    ['CoreMechanic','CORE MECHANIC'], ['VisualStyle','VISUAL STYLE'],
    ['SpecialConstraint','SPECIAL CONSTRAINT']
  ];
  const panels = ['welcome','round','results'];
  const $ = id => document.getElementById(id);
  let round = 0;
  let chosen = [];
  let eightCards = [];
  let picked = false;

  function show(id) { panels.forEach(p => $(p).classList.toggle('hidden',p !== id)); }
  function shuffle(values) {
    const a = [...values];
    for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function imageSrc(category,file) { return 'CardImages/'+encodeURIComponent(category)+'/'+encodeURIComponent(file); }
  function el(tag,css,text){const n=document.createElement(tag); if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;}
  function start(){chosen=[];round=0;setupRound();}
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
  $('start').addEventListener('click',start);
  $('next').addEventListener('click',next);
  $('restart').addEventListener('click',()=>show('welcome'));
  // Keyboard accessibility: on screen, select a card by clicking or using Tab + Enter.
  show('welcome');
})();
