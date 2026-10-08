(function(){
  const loginView=document.getElementById('admin-login-view');
  const adminView=document.getElementById('admin-view');
  const loginError=document.getElementById('admin-login-error');
  const notice=document.getElementById('admin-notice');
  const tabs=[...document.querySelectorAll('.tab')];
  const sections={students:document.getElementById('tab-students'),questions:document.getElementById('tab-questions'),results:document.getElementById('tab-results'),settings:document.getElementById('tab-settings'),reflections:document.getElementById('tab-reflections')};
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});
  function show(el,msg,type){ el.textContent=msg||''; el.className='notice '+(type||'')+(msg?'':' hidden'); }
  function setTab(name){ tabs.forEach(t=>t.classList.toggle('active',t.dataset.tab===name)); Object.entries(sections).forEach(([k,v])=>v.classList.toggle('hidden',k!==name)); }

  async function login(){
    show(loginError,'');
    const username=document.getElementById('admin-username').value.trim();
    const password=document.getElementById('admin-password').value;
    if(!username||!password)return show(loginError,'請輸入管理員帳號及密碼。','error');
    try{const d=await api.post('/admin/login',{username,password}); api.setToken(d.token,'admin'); await openAdmin();}
    catch(err){show(loginError,err.message,'error');}
  }
  async function tryExisting(){ if(api.tokenRole()!=='admin')return; try{await api.get('/admin/me');await openAdmin();}catch(_){api.clearToken();} }
  async function openAdmin(){
    loginView.classList.add('hidden'); adminView.classList.remove('hidden');
    await Promise.all([loadStudents(),loadQuestions(),loadSettings(),loadReflectionStudents()]);
    const d=new Date(); document.getElementById('results-date').value=d.toLocaleDateString('en-CA',{timeZone:'UTC'});
  }

  async function loadStudents(){
    try{const d=await api.get('/admin/students'); const html=`<table><thead><tr><th>學生</th><th>狀態</th><th>建立時間</th><th>操作</th></tr></thead><tbody>${d.students.map(s=>`<tr><td>${esc(s.display_name)}</td><td><span class="badge ${s.active?'ok':'no'}">${s.active?'啟用':'停用'}</span></td><td>${esc(s.created_at_display)}</td><td><button class="secondary-btn action-toggle" data-id="${s.id}" data-active="${s.active}">${s.active?'停用':'啟用'}</button> <button class="secondary-btn action-reset" data-id="${s.id}">重設 PIN</button></td></tr>`).join('')}</tbody></table>`; document.getElementById('students-table').innerHTML=html;
      document.querySelectorAll('.action-toggle').forEach(b=>b.addEventListener('click',()=>toggleStudent(b.dataset.id,b.dataset.active!=='true')));
      document.querySelectorAll('.action-reset').forEach(b=>b.addEventListener('click',()=>resetPin(b.dataset.id)));
    }catch(err){show(notice,err.message,'error');}
  }
  async function createStudent(e){
    e.preventDefault(); const name=document.getElementById('new-student-name').value.trim(); const pin=document.getElementById('new-student-pin').value.trim();
    if(!/^\d{4}$/.test(pin))return show(notice,'PIN 必須是 4 位數字。','error');
    try{await api.post('/admin/students',{display_name:name,pin}); e.target.reset(); show(notice,'學生已新增。','success'); await loadStudents();}catch(err){show(notice,err.message,'error');}
  }
  async function toggleStudent(id,active){try{await api.put('/admin/students/'+id,{active});await loadStudents();show(notice,active?'學生已啟用。':'學生已停用。','success');}catch(err){show(notice,err.message,'error');}}
  async function resetPin(id){const pin=prompt('請輸入新的四位 PIN：',''); if(!pin)return; if(!/^\d{4}$/.test(pin))return alert('PIN 必須是 4 位數字。'); try{await api.put('/admin/students/'+id,{pin});show(notice,'PIN 已更新。','success');}catch(err){show(notice,err.message,'error');}}

  async function loadQuestions(){
    try{const d=await api.get('/admin/questions'); document.getElementById('questions-table').innerHTML=`<table><thead><tr><th>日期</th><th>問題</th><th>正確</th></tr></thead><tbody>${d.questions.map(q=>`<tr><td>${esc(q.question_date)}</td><td>${esc(q.question_text)}</td><td>${q.correct_option===1?'一':'二'}</td></tr>`).join('')}</tbody></table>`;}catch(err){show(notice,err.message,'error');}
  }
  async function saveQuestion(e){
    e.preventDefault(); const payload={question_date:document.getElementById('question-date').value,question_text:document.getElementById('question-text-admin').value.trim(),option1:document.getElementById('option1-admin').value.trim(),option2:document.getElementById('option2-admin').value.trim(),correct_option:Number(document.getElementById('correct-option').value)};
    try{await api.post('/admin/questions',payload);show(notice,'題目已儲存。','success');await loadQuestions();}catch(err){show(notice,err.message,'error');}
  }

  async function loadSettings(){try{const d=await api.get('/admin/settings');document.getElementById('publish-time').value=d.publish_time;document.getElementById('close-time').value=d.close_time;document.getElementById('timezone').value=d.timezone;}catch(err){show(notice,err.message,'error');}}
  async function loadReflectionStudents(){
    const select=document.getElementById('reflection-student-select');
    try{
      const d=await api.get('/admin/students');
      const current=select.value;
      select.innerHTML='<option value="">請選擇學生</option>'+d.students.map(s=>`<option value="${s.id}">${esc(s.display_name)}${s.active?'':'（停用）'}</option>`).join('');
      if(current)select.value=current;
      if(select.value)await loadAdminReflections(select.value);
    }catch(err){show(notice,err.message,'error');}
  }

  function renderAdminNotes(items,targetId,kind){
    const el=document.getElementById(targetId);
    const title=kind==='tianyan'?'天眼':'感應';
    el.innerHTML=items.length?items.map(x=>`<div class="admin-note-item">
      <div class="admin-note-body"><div class="admin-note-kind">${title}</div><div>${esc(x.content).replace(/\n/g,'<br>')}</div><div class="tiny-note">${new Date(x.created_at).toLocaleString('zh-Hant')}</div></div>
      <div class="admin-note-actions"><button class="text-btn note-edit" data-id="${x.id}" data-content="${encodeURIComponent(x.content)}">編輯</button><button class="text-btn note-delete" data-id="${x.id}">刪除</button></div>
    </div>`).join(''):'<div class="empty-state">目前沒有留言。</div>';
    el.querySelectorAll('.note-edit').forEach(b=>b.addEventListener('click',()=>editAdminNote(b.dataset.id,decodeURIComponent(b.dataset.content))));
    el.querySelectorAll('.note-delete').forEach(b=>b.addEventListener('click',()=>deleteAdminNote(b.dataset.id)));
  }

  async function loadAdminReflections(studentId){
    if(!studentId){document.getElementById('reflection-admin-content').classList.add('hidden');return;}
    try{
      const d=await api.get('/admin/reflections?student_id='+encodeURIComponent(studentId));
      document.getElementById('reflection-admin-content').classList.remove('hidden');
      renderAdminNotes(d.notes.filter(x=>x.note_type==='tianyan'),'tianyan-admin-list','tianyan');
      renderAdminNotes(d.notes.filter(x=>x.note_type==='ganying'),'ganying-admin-list','ganying');
      renderAdminGoals(d.goals);
      renderAdminQuestions(d.questions);
    }catch(err){show(notice,err.message,'error');}
  }

  async function saveAdminNote(kind){
    const studentId=document.getElementById('reflection-student-select').value;
    const input=document.getElementById(kind+'-input');
    const content=input.value.trim();
    if(!studentId)return show(notice,'請先選擇學生。','error');
    if(!content)return show(notice,'請輸入留言內容。','error');
    try{await api.post('/admin/reflections/notes',{student_id:studentId,note_type:kind,content});input.value='';show(notice,(kind==='tianyan'?'天眼':'感應')+'已留下。','success');await loadAdminReflections(studentId);}
    catch(err){show(notice,err.message,'error');}
  }

  async function editAdminNote(id,current){
    const content=prompt('修改留言：',current||'');
    if(content===null)return;
    const value=content.trim();
    if(!value)return alert('留言不能留白。');
    try{await api.put('/admin/reflections/notes/'+id,{content:value});show(notice,'留言已更新。','success');await loadAdminReflections(document.getElementById('reflection-student-select').value);}
    catch(err){show(notice,err.message,'error');}
  }

  async function deleteAdminNote(id){
    if(!confirm('確定刪除這則留言？'))return;
    try{await api.delete('/admin/reflections/notes/'+id);show(notice,'留言已刪除。','success');await loadAdminReflections(document.getElementById('reflection-student-select').value);}
    catch(err){show(notice,err.message,'error');}
  }

  function renderAdminGoals(items){
    const el=document.getElementById('admin-goals-list');
    el.innerHTML=items.map(g=>`<div class="admin-goal-row">
      <div class="admin-goal-no">${g.slot}</div>
      <div class="admin-goal-main"><div class="admin-goal-prompt">為什麼學法？</div><textarea class="field admin-goal-answer" data-slot="${g.slot}" rows="3" maxlength="2000">${esc(g.answer_text||'')}</textarea><div class="tiny-note">${g.answer_text?'學生最後更新：'+new Date(g.updated_at).toLocaleDateString('zh-Hant')+'｜學生已使用修改：'+g.edit_count+'/2':'尚未回答'}</div></div>
      <button class="secondary-btn admin-goal-save" data-slot="${g.slot}">儲存</button>
    </div>`).join('');
    el.querySelectorAll('.admin-goal-save').forEach(b=>b.addEventListener('click',()=>saveAdminGoal(Number(b.dataset.slot))));
  }

  async function saveAdminGoal(slot){
    const studentId=document.getElementById('reflection-student-select').value;
    const textarea=document.querySelector('.admin-goal-answer[data-slot="'+slot+'"]');
    try{await api.put('/admin/reflections/goals/'+slot,{student_id:studentId,answer_text:textarea.value.trim()});show(notice,'第 '+slot+' 項目標已由管理員更新。','success');await loadAdminReflections(studentId);}
    catch(err){show(notice,err.message,'error');}
  }

  function renderAdminQuestions(items){
    const el=document.getElementById('admin-questions-list');
    el.innerHTML=items.length?items.map(x=>`<div class="admin-question-row">
      <div class="admin-question-part"><div class="thread-label">學生問題</div><div class="thread-copy">${esc(x.question_text).replace(/\n/g,'<br>')}</div><div class="tiny-note">${new Date(x.created_at).toLocaleString('zh-Hant')}</div></div>
      <div class="admin-question-part answer-part"><div class="thread-label">老師解答</div><textarea class="field admin-question-answer" data-id="${x.id}" rows="4" maxlength="5000">${esc(x.admin_answer||'')}</textarea><div class="tiny-note">${x.answered_at?'上次解答：'+new Date(x.answered_at).toLocaleString('zh-Hant'):'尚未解答'}</div><button class="secondary-btn admin-answer-save" data-id="${x.id}">儲存解答</button></div>
    </div>`).join(''):'<div class="empty-state">這位學生目前沒有提出問題。</div>';
    el.querySelectorAll('.admin-answer-save').forEach(b=>b.addEventListener('click',()=>saveAdminAnswer(b.dataset.id)));
  }

  async function saveAdminAnswer(id){
    const studentId=document.getElementById('reflection-student-select').value;
    const textarea=document.querySelector('.admin-question-answer[data-id="'+id+'"]');
    try{await api.put('/admin/reflections/questions/'+id,{admin_answer:textarea.value.trim()});show(notice,'解答已更新。','success');await loadAdminReflections(studentId);}
    catch(err){show(notice,err.message,'error');}
  }

  async function saveSettings(e){e.preventDefault(); const payload={publish_time:document.getElementById('publish-time').value,close_time:document.getElementById('close-time').value,timezone:document.getElementById('timezone').value.trim()}; try{await api.put('/admin/settings',payload);show(notice,'時間設定已更新。','success');}catch(err){show(notice,err.message,'error');}}

  async function loadResults(){
    const date=document.getElementById('results-date').value; if(!date)return;
    try{const d=await api.get('/admin/results?date='+encodeURIComponent(date));
      document.getElementById('results-table').innerHTML=`<p class="muted">日期：${esc(d.question_date)}　｜　正確答案：${d.correct_option===1?'一':'二'}　｜　狀態：${esc(d.status_label)}</p><table><thead><tr><th>學生</th><th>答案</th><th>結果</th></tr></thead><tbody>${d.rows.map(r=>`<tr><td>${esc(r.display_name)}</td><td>${r.choice?esc(r.choice===1?'一':'二'):'未作答'}</td><td>${r.choice?(r.is_correct?'<span class="badge ok">答對</span>':'<span class="badge no">答錯</span>'):'<span class="badge">未作答</span>'}</td></tr>`).join('')}</tbody></table>`;
    }catch(err){show(notice,err.message,'error');}
  }

  document.getElementById('admin-login').addEventListener('click',login);
  document.getElementById('admin-password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
  document.getElementById('admin-logout').addEventListener('click',()=>{api.clearToken();location.reload();});
  document.getElementById('student-form').addEventListener('submit',createStudent);
  document.getElementById('question-form').addEventListener('submit',saveQuestion);
  document.getElementById('settings-form').addEventListener('submit',saveSettings);
  document.getElementById('load-results').addEventListener('click',loadResults);
  document.getElementById('reflection-student-select').addEventListener('change',e=>loadAdminReflections(e.target.value));
  document.getElementById('tianyan-form').addEventListener('submit',e=>{e.preventDefault();saveAdminNote('tianyan');});
  document.getElementById('ganying-form').addEventListener('submit',e=>{e.preventDefault();saveAdminNote('ganying');});
  tabs.forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.tab)));
  document.getElementById('new-student-pin').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,4));
  tryExisting();
})();
