(function(){
  const auth=document.getElementById('tree-auth');
  const notice=document.getElementById('tree-notice');
  const image=document.getElementById('tree-stage-image');
  const fallback=document.getElementById('tree-art-fallback');
  const hanging=document.getElementById('tree-hanging-fruits');
  const groundFruits=document.getElementById('tree-ground-fruits');

  // Use uploaded sun/moon PNGs when present; otherwise retain the built-in glyph.
  document.querySelectorAll('.tree-celestial img.celestial-image').forEach(img=>{
    const parent=img.parentElement;
    const ready=()=>parent.classList.add('image-ready');
    const failed=()=>parent.classList.remove('image-ready');
    img.addEventListener('load',ready,{once:true});
    img.addEventListener('error',failed,{once:true});
    if(img.complete){
      if(img.naturalWidth>0) ready();
      else failed();
    }
  });
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  // 八階顯示沿用現有素材：第七階使用 mature-tree，第八階使用 world-tree。
  // 舊的 stage-07-growing-tree.png 保留在資料夾中，不再作為獨立階段使用。
  const STAGE_IMAGES=[
    'assets/world-tree/stage-01-land.png',
    'assets/world-tree/stage-02-seed.png',
    'assets/world-tree/stage-03-sprout.png',
    'assets/world-tree/stage-04-two-leaves.png',
    'assets/world-tree/stage-05-seedling.png',
    'assets/world-tree/stage-06-young-tree.png',
    'assets/world-tree/stage-08-mature-tree.png',
    'assets/world-tree/stage-09-world-tree.png'
  ];
  const STAGE_CAPTIONS=[
    '萬物未萌，靜候靈種。',
    '靈種入土，根脈開始積蓄力量。',
    '種子破土，初生嫩芽迎向天光。',
    '雙葉初展，幼苗開始穩穩扎根。',
    '幼苗初立，日積月累向上生長。',
    '小樹成形，根深枝展。',
    '蒼樹成蔭，根深葉茂，靜待圓滿。',
    '世界初成，靈樹巍然佇立。'
  ];
  // 節錄自《皇明祖訓·序》，每次進入靈樹隨機顯示一條。
  const QUOTES=[
    '朝夕親覽，以求至當。',
    '民漸知禁。',
    '開導後人，立為家法。',
    '其敬戒之哉！',
    '勞心焦思，慮患防微。',
    '備嘗艱苦。',
    '博採眾長。',
    '始得成就。',
    '不負朕垂法之意。',
    '天地、祖宗亦將孚佑於無窮矣！',
    '慎終如始，永保泰平。',
    '謀猷弘遠，垂法後世。',
    '思患預防，不可懈怠。',
    '克終厥成，福澤綿長。',
    '垂法後世，永為龜鑑。',
    '克承統緒，永昌厥後。',
    '安不忘危，治不忘亂。',
    '循序漸進，以底於成。',
    '垂統立極，垂裕後昆。',
    '正家之道，始於謹微。',
    '垂戒子孫，永為世守。',
    '圖安遠謀，昭示來茲。',
    '修德立政，以固邦基。',
    '昭事上帝，克享天心。',
    '積累德義，永保無疆。',
    '謹言慎行，以昭萬世。',
    '防微杜漸，思患預防。',
    '丕承基業，永底于昌。'
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
    const scene=document.getElementById('world-tree-scene');
    fallback.dataset.stage=String(stage);
    fallback.classList.remove('hidden');
    image.classList.add('hidden');
    // Default canvas ratio is 16:9; once an uploaded image loads, the scene
    // adopts that image's intrinsic ratio so no old frame/gutters protrude.
    scene.style.aspectRatio='16 / 9';
    const fitToImage=()=>{
      if(image.naturalWidth>0 && image.naturalHeight>0){
        scene.style.aspectRatio=image.naturalWidth+' / '+image.naturalHeight;
        image.classList.remove('hidden');
        fallback.classList.add('hidden');
      }
    };
    image.onload=fitToImage;
    image.onerror=()=>{
      scene.style.aspectRatio='16 / 9';
      image.classList.add('hidden');
      fallback.classList.remove('hidden');
    };
    image.src=STAGE_IMAGES[stage-1] || STAGE_IMAGES[0];
    if(image.complete && image.naturalWidth>0) fitToImage();
  }

  function attachFruitImageFallbacks(root){
    root.querySelectorAll('img.gold-fruit-image').forEach(img=>{
      const parent=img.parentElement;
      const ready=()=>parent.classList.add('image-ready');
      const failed=()=>parent.classList.remove('image-ready');
      img.addEventListener('load',ready,{once:true});
      img.addEventListener('error',failed,{once:true});
      if(img.complete){
        if(img.naturalWidth>0) ready();
        else failed();
      }
    });
  }

  function renderFruits(hangingCount,fallenCount,isMaxStage){
    hanging.innerHTML='';
    groundFruits.innerHTML='';

    // Each successful answer after reaching stage eight becomes one fruit.
    // Fruit images are positioned individually, so the tree can accumulate them.
    if(isMaxStage && hangingCount>0){
      const visible=Math.min(hangingCount,HANG_POSITIONS.length);
      hanging.innerHTML=HANG_POSITIONS.slice(0,visible).map((p,i)=>
        '<span class="tree-fruit-unit" style="left:'+p[0]+'%;top:'+p[1]+'%;animation-delay:'+(i*.08)+'s"><img class="gold-fruit-image" src="assets/world-tree/fruit-gold.png" alt=""><i class="gold-fruit-fallback"></i></span>'
      ).join('');
      if(hangingCount>visible){
        hanging.innerHTML+='<span class="tree-fruit-extra">+'+(hangingCount-visible)+'</span>';
      }
      attachFruitImageFallbacks(hanging);
    }

    // Each fallen fruit remains visible on the ground. Positions are stable,
    // allowing the pile to grow as more fruit drops over time.
    const visibleGround=Math.min(fallenCount,120);
    const dots=[];
    for(let i=0;i<visibleGround;i++){
      const left=7+((i*37)%86);
      const top=8+((i*23)%78);
      const size=13+(i%5);
      const tilt=((i%7)-3)*5;
      dots.push(
        '<span class="ground-fruit-unit" style="left:'+left+'%;top:'+top+'%;width:'+size+'px;height:'+size+'px;transform:rotate('+tilt+'deg)"><img class="gold-fruit-image" src="assets/world-tree/fruit-gold.png" alt=""><i class="gold-fruit-fallback"></i></span>'
      );
    }
    groundFruits.innerHTML=dots.join('');
    if(fallenCount>visibleGround){
      groundFruits.innerHTML+='<span class="ground-fruit-extra">+'+(fallenCount-visibleGround)+' 顆</span>';
    }
    attachFruitImageFallbacks(groundFruits);
  }

  function render(data){
    const stage=Math.max(1,Math.min(8,Number(data.stage)||1));
    const isMax=stage===8;
    document.getElementById('tree-stage-name').textContent=data.stage_name||'一方靈土';
    document.getElementById('tree-stage-caption').textContent=STAGE_CAPTIONS[stage-1];

    const double=!!data.double_active;
    document.getElementById('tree-sun').classList.toggle('hidden',!double);
    document.getElementById('tree-moon').classList.toggle('hidden',double);

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
