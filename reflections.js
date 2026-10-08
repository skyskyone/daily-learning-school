(function(){
  const auth = document.getElementById('reflection-auth');
  const notice = document.getElementById('reflection-notice');
  const home = document.getElementById('reflection-home');
  const view = document.getElementById('reflection-view');
  const viewTitle = document.getElementById('reflection-view-title');
  const tianyan = document.getElementById('tianyan-list');
  const ganying = document.getElementById('ganying-list');
  const goals = document.getElementById('goals-list');
  const questions = document.getElementById('student-questions-list');
  const questionForm = document.getElementById('student-question-form');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const show=(el,msg,type)=>{el.textContent=msg||'';el.className='notice '+(type||'')+(msg?'':' hidden');};
  const fmt=v=>v?new Date(v).toLocaleDateString('zh-Hant',{year:'numeric',month:'2-digit',day:'2-digit'}):'';
  const titles={tianyan:'天眼',ganying:'感應',goals:'目標',questions:'問題區'};
  let reflectionData=null;
  let loaded=false;

  function renderNotes(target,items,empty){
    target.innerHTML = items.length
      ? items.map(x=>`<article class="note-card"><div class="note-card-copy">${esc(x.content).replace(/\n/g,'<br>')}</div><div class="note-card-date">${fmt(x.created_at)}</div></article>`).join('')
      : `<div class="empty-state">${empty}</div>`;
  }

  function renderGoals(items){
    goals.innerHTML = items.map(g=>{
      const answered=!!String(g.answer_text||'').trim();
      const left=Math.max(0,2-(Number(g.edit_count)||0));
      return `<article class="goal-card ${answered?'answered':''}">
        <div class="goal-number">${g.slot}</div>
        <div class="goal-main">
          <div class="goal-prompt">第 ${g.slot} 項｜為什麼學法？</div>
          <textarea class="field goal-answer" data-slot="${g.slot}" rows="3" maxlength="2000" ${(answered && left===0)?'readonly':''} placeholder="${answered?'':'寫下你的答案'}">${esc(g.answer_text||'')}</textarea>
          <div class="goal-meta">
            <span>${answered?'首次回答：'+fmt(g.first_answered_at || g.updated_at):'尚未回答'}</span>
            <span>${answered ? ((g.first_answered_at && g.updated_at && g.first_answered_at!==g.updated_at)?'最後更新：'+fmt(g.updated_at)+'｜':'')+'剩餘修改：'+left+' 次' : '第一次回答後可再修改 2 次'}</span>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderQuestions(items){
    questions.innerHTML = items.length ? items.map(x=>`<article class="question-thread">
      <div class="question-side"><div class="thread-label">我的問題</div><div class="thread-copy">${esc(x.question_text).replace(/\n/g,'<br>')}</div><div class="thread-date">${fmt(x.created_at)}</div></div>
      <div class="answer-side"><div class="thread-label">老師解答</div><div class="thread-copy">${x.admin_answer?esc(x.admin_answer).replace(/\n/g,'<br>'):'尚未解答'}</div><div class="thread-date">${x.answered_at?'解答日期：'+fmt(x.answered_at):'等待老師回覆'}</div></div>
    </article>`).join('') : '<div class="empty-state">目前尚未提出問題。</div>';
  }

  function renderData(d){
    reflectionData=d;
    renderNotes(tianyan,d.notes.filter(x=>x.note_type==='tianyan'),'老師尚未留下天眼。');
    renderNotes(ganying,d.notes.filter(x=>x.note_type==='ganying'),'老師尚未留下感應。');
    renderGoals(d.goals);
    renderQuestions(d.questions);
    loaded=true;
  }

  async function loadData(){
    try{
      const d=await api.get('/student/reflections');
      renderData(d);
    }catch(err){
      if(err.status===401){api.clearToken();location.href='index.html';return;}
      show(notice,err.message==='找不到 API 路徑。'?'心得區服務尚未完成更新，請稍後再試。':err.message,'error');
    }
  }

  async function openView(name){
    if(api.tokenRole()!=='student'){
      auth.textContent='請先從首頁登入學生身份。';
      auth.className='notice error';
      return;
    }
    home.classList.add('hidden');
    view.classList.remove('hidden');
    viewTitle.textContent=titles[name] || '心得區';
    ['tianyan','ganying','goals','questions'].forEach(k=>document.getElementById('view-'+k).classList.toggle('hidden',k!==name));
    if(!loaded) await loadData();
  }

  function closeView(){
    view.classList.add('hidden');
    home.classList.remove('hidden');
    show(notice,'');
  }

  async function saveAllGoals(){
    if(!reflectionData)return;
    const buttons=[...document.querySelectorAll('.goal-answer')];
    const entries=buttons.map(el=>({slot:Number(el.dataset.slot),value:el.value.trim(),original:String((reflectionData.goals.find(g=>g.slot===Number(el.dataset.slot))||{}).answer_text||'').trim()}))
      .filter(x=>x.value && x.value!==x.original);
    if(!entries.length){show(notice,'目前沒有需要儲存的新答案。','success');return;}
    const saveBtn=document.getElementById('save-all-goals');
    saveBtn.disabled=true;
    try{
      for(const item of entries){
        await api.put('/student/goals/'+item.slot,{answer_text:item.value});
      }
      show(notice,'已儲存本次填寫的目標答案。','success');
      await loadData();
    }catch(err){
      show(notice,err.message,'error');
    }finally{
      saveBtn.disabled=false;
    }
  }

  questionForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const input=document.getElementById('student-question-text');
    const value=input.value.trim();
    if(!value)return show(notice,'請先寫下你的問題。','error');
    try{
      await api.post('/student/questions',{question_text:value});
      input.value='';
      show(notice,'問題已送出，等待老師解答。','success');
      await loadData();
    }catch(err){show(notice,err.message,'error');}
  });

  document.querySelectorAll('.reflection-menu-card').forEach(btn=>btn.addEventListener('click',()=>openView(btn.dataset.view)));
  document.getElementById('reflection-back').addEventListener('click',closeView);
  document.getElementById('save-all-goals').addEventListener('click',saveAllGoals);
  document.getElementById('reflection-logout').addEventListener('click',()=>{api.clearToken();location.href='index.html';});

  if(api.tokenRole()!=='student'){
    auth.textContent='請先從首頁登入學生身份。';
    auth.className='notice error';
  }
})();