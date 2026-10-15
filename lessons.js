(function(){
  const auth=document.getElementById('lesson-auth');
  const notice=document.getElementById('lesson-notice');
  const currentView=document.getElementById('lesson-current-view');
  const historyList=document.getElementById('lesson-history-list');
  const commentsArea=document.getElementById('lesson-comments-area');
  const commentForm=document.getElementById('lesson-comment-form');
  const commentInput=document.getElementById('lesson-comment-input');
  const commentsList=document.getElementById('lesson-comments-list');
  const guidance=document.getElementById('lesson-comment-guidance');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('zh-Hant',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  let selectedLesson=null;
  let selectedIsCurrent=false;
  let archiveLessons=[];

  function videoId(value){
    try{
      const u=new URL(value);
      const host=u.hostname.toLowerCase().replace(/^www\./,'');
      if(host==='youtu.be'){
        const id=u.pathname.split('/').filter(Boolean)[0]||'';
        return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
      }
      if(!['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))return null;
      let id=u.searchParams.get('v')||'';
      if(!id){const m=u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);id=m?m[1]:'';}
      return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
    }catch(_){return null;}
  }

  function show(el,msg,type){
    el.textContent=msg||'';
    el.className='notice '+(type||'')+(msg?'':' hidden');
  }

  function createPlayer(lesson){
    const wrap=document.createElement('div');
    wrap.className='lesson-player-wrap';
    const id=videoId(lesson.youtube_url);
    if(!id){
      wrap.textContent='這段影片網址無法辨識，請通知老師檢查。';
      return wrap;
    }
    const iframe=document.createElement('iframe');
    iframe.className='lesson-player';
    iframe.src='https://www.youtube-nocookie.com/embed/'+id;
    iframe.title=lesson.title+' YouTube 播放器';
    iframe.loading='lazy';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen=true;
    wrap.appendChild(iframe);
    return wrap;
  }

  function renderHistory(items){
    archiveLessons=items||[];
    if(!archiveLessons.length){
      historyList.innerHTML='<div class="empty-state">暫無歷史教學影片。</div>';
      return;
    }
    historyList.innerHTML=archiveLessons.map(x=>
      '<button type="button" class="lesson-history-item '+(selectedLesson&&selectedLesson.id===x.id?'active':'')+'" data-id="'+esc(x.id)+'">'+
        '<strong>'+esc(x.title)+'</strong>'+
        '<span>'+esc(fmt(x.starts_at))+'</span>'+
        '<small>已結束 · 歷史紀錄</small>'+
      '</button>'
    ).join('');
    historyList.querySelectorAll('.lesson-history-item').forEach(btn=>{
      btn.addEventListener('click',()=>loadArchive(btn.dataset.id));
    });
  }

  function renderComments(items,canComment){
    guidance.textContent=canComment
      ?'看完影片後在這留下你的問題，聚會時大家一起討論。'
      :'這段教學已結束，留言仍可查閱；你仍可以修改自己曾留下的留言。';
    commentForm.classList.toggle('hidden',!canComment);
    commentsList.innerHTML=items.length?items.map(x=>
      '<article class="lesson-comment-card">'+
        '<div class="lesson-comment-head"><strong>'+esc(x.student_name||'學生')+'</strong><span>'+esc(fmt(x.created_at))+(x.updated_at&&x.updated_at!==x.created_at?' · 已修改':'')+'</span></div>'+
        '<div class="lesson-comment-copy">'+esc(x.content).replace(/\n/g,'<br>')+'</div>'+
        (x.is_mine?'<button type="button" class="text-btn lesson-comment-edit" data-id="'+esc(x.id)+'" data-content="'+encodeURIComponent(x.content)+'">修改留言</button>':'')+
      '</article>'
    ).join(''):'<div class="empty-state">目前還沒有留言，歡迎提出第一個疑問。</div>';
    commentsList.querySelectorAll('.lesson-comment-edit').forEach(btn=>btn.addEventListener('click',()=>editComment(btn.dataset.id,decodeURIComponent(btn.dataset.content))));
  }

  function renderLesson(lesson,comments,isCurrent){
    selectedLesson=lesson;
    selectedIsCurrent=!!isCurrent;
    if(!lesson){
      currentView.innerHTML='<div class="lesson-empty"><h2>目前沒有開放中的教學影片</h2><p class="muted">老師設定開放期間後，影片會在這裡出現。已結束的影片可從左側歷史紀錄進入。</p></div>';
      commentsArea.classList.add('hidden');
      return;
    }
    currentView.innerHTML='';
    const heading=document.createElement('div');
    heading.className='lesson-video-heading';
    const title=document.createElement('h2');
    title.textContent=lesson.title;
    const period=document.createElement('p');
    period.className='lesson-period muted';
    period.textContent=(isCurrent?'開放期間：':'教學期間：')+fmt(lesson.starts_at)+' ～ '+fmt(lesson.ends_at);
    heading.append(title,period,createPlayer(lesson));
    currentView.appendChild(heading);
    commentsArea.classList.remove('hidden');
    renderComments(comments||[],isCurrent);
    renderHistory(archiveLessons);
  }

  async function loadHome(){
    try{
      const data=await api.get('/student/lessons');
      archiveLessons=data.archived_lessons||[];
      renderHistory(archiveLessons);
      renderLesson(data.current_lesson,data.comments||[],!!data.current_lesson);
    }catch(err){
      if(err.status===401){api.clearToken();location.href='index.html';return;}
      show(notice,err.message||'無法載入教學影片。','error');
    }
  }

  async function loadArchive(id){
    try{
      const data=await api.get('/student/lessons/'+encodeURIComponent(id));
      renderLesson(data.lesson,data.comments||[],false);
      renderHistory(archiveLessons);
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(err){show(notice,err.message||'無法載入歷史影片。','error');}
  }

  async function refreshSelected(){
    if(selectedLesson&&!selectedIsCurrent){
      await loadArchive(selectedLesson.id);
    }else{
      const id=selectedLesson&&selectedLesson.id;
      await loadHome();
      if(id&&(!selectedLesson||selectedLesson.id!==id)) await loadArchive(id);
    }
  }

  async function editComment(id,oldContent){
    const content=prompt('修改你的留言：',oldContent);
    if(content===null)return;
    if(!content.trim()){alert('留言不能留白。');return;}
    try{
      await api.put('/student/lesson-comments/'+encodeURIComponent(id),{content:content.trim()});
      show(notice,'留言已更新。','success');
      await refreshSelected();
    }catch(err){show(notice,err.message||'無法修改留言。','error');}
  }

  commentForm.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!selectedLesson||!selectedIsCurrent)return;
    const content=commentInput.value.trim();
    if(!content){show(notice,'請輸入留言內容。','error');return;}
    const submit=commentForm.querySelector('button[type="submit"]');
    submit.disabled=true;
    try{
      await api.post('/student/lessons/'+encodeURIComponent(selectedLesson.id)+'/comments',{content});
      commentInput.value='';
      show(notice,'留言已送出。','success');
      await loadHome();
    }catch(err){show(notice,err.message||'無法送出留言。','error');}
    finally{submit.disabled=false;}
  });

  document.getElementById('lesson-logout').addEventListener('click',()=>{api.clearToken();location.href='index.html';});
  if(api.tokenRole()!=='student'){
    auth.textContent='請先從首頁登入學生身份。';
    auth.className='notice error';
    currentView.innerHTML='<a href="index.html">返回登入頁</a>';
  }else{
    loadHome();
  }
})();
