(function(){
  const loginView=document.getElementById('admin-login-view');
  const adminView=document.getElementById('admin-view');
  const loginError=document.getElementById('admin-login-error');
  const notice=document.getElementById('admin-notice');
  const tabs=[...document.querySelectorAll('.tab')];
  const sections={students:document.getElementById('tab-students'),questions:document.getElementById('tab-questions'),results:document.getElementById('tab-results'),settings:document.getElementById('tab-settings')};
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
    await Promise.all([loadStudents(),loadQuestions(),loadSettings()]);
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
  tabs.forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.tab)));
  document.getElementById('new-student-pin').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,4));
  tryExisting();
})();
