(function(){
  const auth=document.getElementById('meditation-auth');
  const notice=document.getElementById('meditation-notice');
  const monthList=document.getElementById('meditation-month-list');
  const reviewList=document.getElementById('meditation-review-list');
  const monthHeading=document.getElementById('meditation-current-month');
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
  let reviewByWeek=new Map();
  let selectedMonth='';
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const todayISO=()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return p.year+'-'+p.month+'-'+p.day;
  };
  function show(el,msg,type){
    el.textContent=msg||'';
    el.className='notice '+(type||'')+(msg?'':' hidden');
  }
  function parseISO(value){return new Date(value+'T00:00:00Z');}
  function isoDate(date){return date.getUTCFullYear()+'-'+String(date.getUTCMonth()+1).padStart(2,'0')+'-'+String(date.getUTCDate()).padStart(2,'0');}
  function addDays(value,days){const d=parseISO(value);d.setUTCDate(d.getUTCDate()+days);return isoDate(d);}
  function mondayOf(value){
    const d=parseISO(value);
    const day=d.getUTCDay()||7;
    d.setUTCDate(d.getUTCDate()-(day-1));
    return isoDate(d);
  }
  function monthKey(value){return String(value).slice(0,7);}
  function monthLabel(key){
    const parts=key.split('-');
    return parts[0]+'年'+Number(parts[1])+'月';
  }
  function shortDate(value){
    const d=parseISO(value);
    return (d.getUTCMonth()+1)+'/'+d.getUTCDate();
  }
  function fullDateRange(start){
    const end=addDays(start,6);
    const a=parseISO(start), b=parseISO(end);
    if(a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()){
      return a.getUTCFullYear()+'/'+shortDate(start)+'–'+shortDate(end);
    }
    return a.getUTCFullYear()+'/'+shortDate(start)+'–'+b.getUTCFullYear()+'/'+shortDate(end);
  }
  function getMondaysForMonth(key,includeThrough){
    const [year,month]=key.split('-').map(Number);
    const first=new Date(Date.UTC(year,month-1,1));
    const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
    const result=[];
    for(let day=1;day<=lastDay;day++){
      const d=new Date(Date.UTC(year,month-1,day));
      if(d.getUTCDay()!==1)continue;
      const value=isoDate(d);
      if(includeThrough&&value>includeThrough)continue;
      result.push(value);
    }
    return result;
  }
  function gradeLabel(rating){
    if(rating==='長進')return '<span class="meditation-grade meditation-grade-progress">長進</span>';
    if(rating==='尚可')return '<span class="meditation-grade meditation-grade-fair">尚可</span>';
    if(rating==='不及')return '<span class="meditation-grade meditation-grade-needs">不及</span>';
    return '<span class="meditation-grade meditation-grade-pending">尚未評核</span>';
  }
  function renderMonths(){
    const currentMonth=monthKey(todayISO());
    const months=new Set([currentMonth]);
    reviewByWeek.forEach((_,week)=>months.add(monthKey(week)));
    const ordered=[...months].sort((a,b)=>b.localeCompare(a));
    if(!ordered.includes(selectedMonth))selectedMonth=currentMonth;
    monthList.innerHTML=ordered.map(key=>'<button type="button" class="meditation-month-item'+(key===selectedMonth?' active':'')+'" data-month="'+key+'">'+
      '<span>'+esc(monthLabel(key))+'</span><small>'+(key===currentMonth?'本月':'歷史評核')+'</small></button>').join('');
    monthList.querySelectorAll('.meditation-month-item').forEach(button=>{
      button.addEventListener('click',()=>{
        selectedMonth=button.dataset.month;
        renderMonths();
        renderWeeks();
      });
    });
  }
  function renderWeeks(){
    monthHeading.textContent=monthLabel(selectedMonth);
    const currentMonth=monthKey(todayISO());
    const currentMonday=mondayOf(todayISO());
    const through=selectedMonth===currentMonth?currentMonday:null;
    const mondays=getMondaysForMonth(selectedMonth,through);
    const availableWeeks=[...reviewByWeek.keys()].filter(w=>monthKey(w)===selectedMonth);
    const weeks=[...new Set([...mondays,...availableWeeks])].sort((a,b)=>a.localeCompare(b));
    if(!weeks.length){
      reviewList.innerHTML='<div class="empty-state">這個月份暫時沒有評核紀錄。</div>';
      return;
    }
    reviewList.innerHTML=weeks.map((week,index)=>{
      const item=reviewByWeek.get(week);
      const rating=item?gradeLabel(item.rating):gradeLabel('');
      const comment=item&&item.comment?'<div class="meditation-teacher-comment"><span>師父評語</span><p>'+esc(item.comment).replace(/\n/g,'<br>')+'</p></div>':'<p class="meditation-no-comment">'+(item?'有問題才有評語。':'等待評核。')+'</p>';
      return '<article class="meditation-review-card">'+
        '<div class="meditation-review-head"><div><p class="eyebrow">第 '+(index+1)+' 週</p><h3>'+esc(fullDateRange(week))+'</h3></div>'+rating+'</div>'+
        comment+
      '</article>';
    }).join('');
  }
  function showRandomQuote(){
    const phrase=QUOTES[Math.floor(Math.random()*QUOTES.length)];
    document.getElementById('ancestor-quote').textContent='「'+phrase+'」';
  }
  async function loadReviews(){
    if(api.tokenRole()!=='student'){
      auth.textContent='請先從首頁登入學生身份，再查看打坐評核。';
      auth.className='notice error';
      reviewList.innerHTML='<div class="empty-state">登入學生帳號後即可查看個人評核。</div>';
      return;
    }
    try{
      const data=await api.get('/student/meditation-reviews');
      reviewByWeek=new Map((data.reviews||[]).map(item=>[item.week_start,item]));
      selectedMonth=monthKey(todayISO());
      renderMonths();
      renderWeeks();
    }catch(err){
      if(err.status===401){
        api.clearToken();
        location.href='index.html';
        return;
      }
      show(notice,err.message||'暫時無法讀取打坐評核。','error');
      reviewList.innerHTML='<div class="empty-state">目前未能載入評核資料，請稍後再試。</div>';
    }
  }
  document.getElementById('meditation-logout').addEventListener('click',()=>{
    api.clearToken();
    location.href='index.html';
  });
  showRandomQuote();
  loadReviews();
})();
