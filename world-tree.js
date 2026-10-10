(function(){
  const auth=document.getElementById('tree-auth');
  const notice=document.getElementById('tree-notice');
  const image=document.getElementById('tree-stage-image');
  const fallback=document.getElementById('tree-art-fallback');
  const hanging=document.getElementById('tree-hanging-fruits');
  const groundFruits=document.getElementById('tree-ground-fruits');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const STAGE_IMAGES=[
    'assets/world-tree/stage-01-land.png',
    'assets/world-tree/stage-02-seed.png',
    'assets/world-tree/stage-03-sprout.png',
    'assets/world-tree/stage-04-two-leaves.png',
    'assets/world-tree/stage-05-seedling.png',
    'assets/world-tree/stage-06-young-tree.png',
    'assets/world-tree/stage-07-growing-tree.png',
    'assets/world-tree/stage-08-mature-tree.png',
    'assets/world-tree/stage-09-world-tree.png'
  ];
  const STAGE_CAPTIONS=[
    '一方靈土，萬物未萌，靜候靈種。',
    '靈種入土，根脈開始積蓄力量。',
    '種子破土，初生嫩芽迎向天光。',
    '雙葉初展，幼苗開始穩穩扎根。',
    '幼苗初立，日積月累向上生長。',
    '小樹成形，根深枝展。',
    '青木舒枝，逐漸伸展成蔭。',
    '蒼樹成蔭，離世界樹只差最後一步。',
    '世界樹已成。樹身不再長高，往後以金色果實記錄每一次精進。'
  ];
  const QUOTES=[
    '靜以養心，勤以修身。',
    '持之以恆，方見寸進。',
    '今日精進一寸，明日自有一境。',
    '修習貴在恆常，初心不可輕忘。',
    '心正則念定，念定則行穩。',
    '不急於一時之功，當守每日之勤。',
    '善始善終，積小成大。',
    '靜觀其心，日省其身。',
    '根深不懼風雨，志堅自有成就。',
    '一日一分勤，積久見真章。',
    '守心如一，循序而進。',
    '不因一時得失，忘卻長遠之志。',
    '知所為，明所守，勤所行。',
    '有恆者事竟成，有志者路自明。'
  ];
  const HANG_POSITIONS=[
    [32,45],[43,31],[55,38],[64,48],[37,58],[53,58],
    [70,37],[27,37],[47,47],[61,29],[42,67],[57,69]
  ];

  function show(el,msg,type){
    el.textContent=msg||'';
    el.className='notice '+(type||'')+(msg?'':' hidden');
  }

  function renderStageImage(stage){
    fallback.dataset.stage=String(stage);
    fallback.classList.remove('hidden');
    image.classList.add('hidden');
    image.onload=()=>{
      if(image.naturalWidth>0){
        image.classList.remove('hidden');
        fallback.classList.add('hidden');
      }
    };
    image.onerror=()=>{
      image.classList.add('hidden');
      fallback.classList.remove('hidden');
    };
    image.src=STAGE_IMAGES[stage-1] || STAGE_IMAGES[0];
    if(image.complete && image.naturalWidth>0){
      image.classList.remove('hidden');
      fallback.classList.add('hidden');
    }
  }

  function renderFruits(hangingCount,fallenCount,isMaxStage){
    hanging.innerHTML='';
    groundFruits.innerHTML='';
    if(isMaxStage && hangingCount>0){
      const visible=Math.min(hangingCount,HANG_POSITIONS.length);
      hanging.innerHTML=HANG_POSITIONS.slice(0,visible).map((p,i)=>
        '<span class="tree-fruit-dot" style="left:'+p[0]+'%;top:'+p[1]+'%;animation-delay:'+(i*.08)+'s"></span>'
      ).join('');
      if(hangingCount>visible) hanging.innerHTML+='<span class="tree-fruit-extra">+'+(hangingCount-visible)+'</span>';
    }
    const visibleGround=Math.min(fallenCount,44);
    const dots=[];
    for(let i=0;i<visibleGround;i++){
      const left=8+((i*37)%84);
      const top=16+((i*23)%64);
      const size=7+(i%4);
      dots.push('<span class="ground-fruit-dot" style="left:'+left+'%;top:'+top+'%;width:'+size+'px;height:'+size+'px"></span>');
    }
    groundFruits.innerHTML=dots.join('');
    if(fallenCount>visibleGround){
      groundFruits.innerHTML+='<span class="ground-fruit-extra">另有 '+(fallenCount-visibleGround)+' 顆</span>';
    }
  }

  function render(data){
    const stage=Math.max(1,Math.min(9,Number(data.stage)||1));
    const isMax=stage===9;
    document.getElementById('tree-stage-name').textContent=data.stage_name||'一方靈土';
    document.getElementById('tree-stage-caption').textContent=STAGE_CAPTIONS[stage-1];
    document.getElementById('tree-stage-progress').textContent='階段 '+stage+' / 9';
    document.getElementById('tree-growth-value').textContent='成長值 '+data.growth_value+' / '+data.final_growth_value;
    document.getElementById('tree-progress-fill').style.width=(Number(data.progress_percent)||0)+'%';
    document.getElementById('tree-correct-days').textContent=String(data.correct_days||0);
    document.getElementById('tree-streak').textContent=String(data.current_streak||0);
    document.getElementById('tree-hanging-count').textContent=String(data.hanging_fruits||0);
    document.getElementById('tree-fallen-count').textContent=String(data.fallen_fruits||0);

    const double=!!data.double_active;
    document.getElementById('tree-sun').classList.toggle('hidden',!double);
    document.getElementById('tree-moon').classList.toggle('hidden',double);
    const growthNote=document.getElementById('tree-growth-note');
    if(isMax){
      growthNote.textContent='世界樹已達第九階，樹身固定不再長高。往後每次結算答對，便會結出金色果實；連續答對加倍時，金果也會加倍。';
    }else if(double){
      growthNote.textContent='已連續答對至少兩天！目前啟動加倍成長，下一次結算答對可增加雙倍成長值；一旦答錯或中斷連續答對，便回復正常。';
    }else{
      growthNote.textContent='答對每日題目，靈樹便會向前成長；連續兩天答對後啟動加倍。答錯或中斷連續答對會回復正常成長。';
    }
    renderStageImage(stage);
    renderFruits(Number(data.hanging_fruits)||0,Number(data.fallen_fruits)||0,isMax);
  }

  function showRandomQuote(){
    const phrase=QUOTES[Math.floor(Math.random()*QUOTES.length)];
    document.getElementById('ancestor-quote').textContent='「'+phrase+'」';
  }

  async function loadTree(){
    if(api.tokenRole()!=='student'){
      auth.textContent='請先從首頁登入學生身份，再進入靈樹。';
      auth.className='notice error';
      return;
    }
    try{
      const data=await api.get('/student/world-tree');
      render(data);
    }catch(err){
      if(err.status===401){
        api.clearToken();
        location.href='index.html';
        return;
      }
      show(notice,err.message||'暫時無法讀取靈樹資料。','error');
    }
  }

  document.getElementById('tree-logout').addEventListener('click',()=>{
    api.clearToken();
    location.href='index.html';
  });
  showRandomQuote();
  loadTree();
})();