(function(){
  const loginView=document.getElementById('admin-login-view');
  const adminView=document.getElementById('admin-view');
  const loginError=document.getElementById('admin-login-error');
  const notice=document.getElementById('admin-notice');
  const tabs=[...document.querySelectorAll('.tab')];
  const sections={students:document.getElementById('tab-students'),questions:document.getElementById('tab-questions'),results:document.getElementById('tab-results'),meditation:document.getElementById('tab-meditation'),settings:document.getElementById('tab-settings'),reflections:document.getElementById('tab-reflections'),lessons:document.getElementById('tab-lessons')};
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
    await Promise.all([loadStudents(),loadQuestions(),loadSettings(),loadReflectionStudents(),loadLessons()]);
    const weekInput=document.getElementById('meditation-week-start');
    if(!weekInput.value)weekInput.value=mondayOf(today());
    await loadMeditationWeek();
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

  function mondayOf(value){
    const d=new Date(String(value)+'T00:00:00Z');
    if(Number.isNaN(d.getTime()))return '';
    const day=d.getUTCDay()||7;
    d.setUTCDate(d.getUTCDate()-(day-1));
    return d.toISOString().slice(0,10);
  }
  function datePlusDays(value,days){
    const d=new Date(String(value)+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+days);
    return d.toISOString().slice(0,10);
  }
  function isMonday(value){
    const d=new Date(String(value)+'T00:00:00Z');
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value))&&!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value&&d.getUTCDay()===1;
  }
  async function loadMeditationWeek(){
    const input=document.getElementById('meditation-week-start');
    const list=document.getElementById('meditation-admin-list');
    const period=document.getElementById('meditation-week-period');
    if(!input.value)input.value=mondayOf(today());
    if(!isMonday(input.value)){
      period.textContent='評核週的開始日期必須是星期一。';
      list.innerHTML='<div class="empty-state">請選擇星期一，再載入學生名單。</div>';
      show(notice,'請選擇星期一作為評核週的開始日期。','error');
      return;
    }
    const start=input.value;
    const end=datePlusDays(start,6);
    period.textContent='評核期間：'+start+' 至 '+end+'（星期一至星期日）';
    list.innerHTML='<div class="empty-state">正在載入學生名單……</div>';
    try{
      const data=await api.get('/admin/meditation-reviews?week_start='+encodeURIComponent(start));
      const rows=data.rows||[];
      if(!rows.length){
        list.innerHTML='<div class="empty-state">目前沒有學生名單。</div>';
        return;
      }
      const grades=['長進','尚可','不及'];
      list.innerHTML='<table class="meditation-admin-table"><thead><tr><th>學生</th><th>評核（單選）</th><th>老師評語</th><th>儲存</th></tr></thead><tbody>'+
        rows.map(row=>{
          const gradeOptions=grades.map(grade=>'<label class="meditation-admin-grade"><input type="radio" name="meditation-grade-'+esc(row.id)+'" value="'+grade+'" '+(row.rating===grade?'checked':'')+'><span>'+grade+'</span></label>').join('');
          return '<tr data-student-id="'+esc(row.id)+'">'+
            '<td><strong>'+esc(row.display_name)+'</strong>'+(row.active?'':'<div class="tiny-note">已停用學生</div>')+'</td>'+
            '<td><div class="meditation-admin-grades">'+gradeOptions+'</div></td>'+
            '<td><input type="text" class="field meditation-admin-comment" data-comment-for="'+esc(row.id)+'" maxlength="500" value="'+esc(row.comment||'')+'" placeholder="寫一句簡短評語"></td>'+
            '<td><button type="button" class="secondary-btn meditation-review-save" data-id="'+esc(row.id)+'">儲存</button><div class="meditation-save-status" data-status-for="'+esc(row.id)+'">'+(row.rating?'已儲存':'尚未評核')+'</div></td>'+
          '</tr>';
        }).join('')+'</tbody></table>';
      list.querySelectorAll('.meditation-review-save').forEach(button=>button.addEventListener('click',()=>saveMeditationReview(button.dataset.id,start)));
    }catch(err){
      list.innerHTML='<div class="empty-state">無法載入本週名單。</div>';
      show(notice,err.message||'無法載入打坐評核名單。','error');
    }
  }
  async function saveMeditationReview(studentId,weekStart){
    const checked=document.querySelector('input[name="meditation-grade-'+studentId+'"]:checked');
    const comment=document.querySelector('.meditation-admin-comment[data-comment-for="'+studentId+'"]');
    const status=document.querySelector('.meditation-save-status[data-status-for="'+studentId+'"]');
    if(!checked)return show(notice,'請先為這位學生選擇「長進」、「尚可」或「不及」。','error');
    const button=document.querySelector('.meditation-review-save[data-id="'+studentId+'"]');
    if(button)button.disabled=true;
    try{
      await api.put('/admin/meditation-reviews/'+encodeURIComponent(studentId),{
        week_start:weekStart,
        rating:checked.value,
        comment:comment?comment.value.trim():''
      });
      if(status)status.textContent='已儲存';
      show(notice,'評核已儲存。','success');
    }catch(err){
      show(notice,err.message||'評核儲存失敗。','error');
    }finally{
      if(button)button.disabled=false;
    }
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

  async function loadAdminReflections(studentId){
    if(!studentId){document.getElementById('reflection-admin-content').classList.add('hidden');return;}
    try{
      const d=await api.get('/admin/reflections?student_id='+encodeURIComponent(studentId));
      document.getElementById('reflection-admin-content').classList.remove('hidden');
      renderAdminGoals(d.goals);
      renderAdminQuestions(d.questions);
    }catch(err){show(notice,err.message,'error');}
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

  function datetimeLocalValue(iso){
    if(!iso)return '';
    const d=new Date(iso);
    if(Number.isNaN(d.getTime()))return '';
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }

  function lessonStatus(lesson){
    const now=Date.now();
    if(Date.parse(lesson.ends_at)<=now)return '已結束（歷史紀錄）';
    if(Date.parse(lesson.starts_at)>now)return '尚未開始';
    return '開放中';
  }

  async function loadLessons(){
    try{
      const d=await api.get('/admin/lessons');
      const lessons=d.lessons||[];
      const el=document.getElementById('lessons-admin-table');
      if(!lessons.length){
        el.innerHTML='<div class="empty-state">尚未建立教學影片。</div>';
        return;
      }
      el.innerHTML='<table><thead><tr><th>標題</th><th>開放期間</th><th>狀態</th><th>操作</th></tr></thead><tbody>'+
        lessons.map(x=>'<tr>'+
          '<td><strong>'+esc(x.title)+'</strong><br><a href="'+esc(x.youtube_url)+'" target="_blank" rel="noopener">查看 YouTube 原始網址</a></td>'+
          '<td>'+esc(new Date(x.starts_at).toLocaleString('zh-Hant'))+'<br>至<br>'+esc(new Date(x.ends_at).toLocaleString('zh-Hant'))+'</td>'+
          '<td>'+esc(lessonStatus(x))+'</td>'+
          '<td><button type="button" class="secondary-btn lesson-edit" data-id="'+esc(x.id)+'" data-title="'+esc(encodeURIComponent(x.title))+'" data-url="'+esc(encodeURIComponent(x.youtube_url))+'" data-start="'+esc(x.starts_at)+'" data-end="'+esc(x.ends_at)+'">編輯</button></td>'+
        '</tr>').join('')+'</tbody></table>';
      el.querySelectorAll('.lesson-edit').forEach(b=>b.addEventListener('click',()=>editLesson(b)));
    }catch(err){show(notice,err.message||'無法載入教學影片。','error');}
  }

  function editLesson(button){
    document.getElementById('lesson-id').value=button.dataset.id;
    document.getElementById('lesson-title').value=decodeURIComponent(button.dataset.title||'');
    document.getElementById('lesson-youtube-url').value=decodeURIComponent(button.dataset.url||'');
    document.getElementById('lesson-starts-at').value=datetimeLocalValue(button.dataset.start);
    document.getElementById('lesson-ends-at').value=datetimeLocalValue(button.dataset.end);
    document.getElementById('lesson-save').textContent='儲存修改';
    document.getElementById('lesson-form').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function clearLessonForm(){
    document.getElementById('lesson-form').reset();
    document.getElementById('lesson-id').value='';
    document.getElementById('lesson-save').textContent='新增教學影片';
  }

  async function saveLesson(e){
    e.preventDefault();
    const id=document.getElementById('lesson-id').value;
    const starts=document.getElementById('lesson-starts-at').value;
    const ends=document.getElementById('lesson-ends-at').value;
    if(!starts||!ends||new Date(ends)<=new Date(starts)){
      show(notice,'結束時間必須晚於開始時間。','error');
      return;
    }
    const payload={
      title:document.getElementById('lesson-title').value.trim(),
      youtube_url:document.getElementById('lesson-youtube-url').value.trim(),
      starts_at:new Date(starts).toISOString(),
      ends_at:new Date(ends).toISOString()
    };
    try{
      if(id) await api.put('/admin/lessons/'+encodeURIComponent(id),payload);
      else await api.post('/admin/lessons',payload);
      show(notice,id?'教學影片已更新。':'教學影片已新增。','success');
      clearLessonForm();
      await loadLessons();
    }catch(err){show(notice,err.message||'無法儲存教學影片。','error');}
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
  document.getElementById('load-meditation-week').addEventListener('click',loadMeditationWeek);
  document.getElementById('meditation-week-start').addEventListener('change',loadMeditationWeek);
  document.getElementById('lesson-form').addEventListener('submit',saveLesson);
  document.getElementById('lesson-clear').addEventListener('click',clearLessonForm);
  document.getElementById('reflection-student-select').addEventListener('change',e=>loadAdminReflections(e.target.value));
  tabs.forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.tab)));
  document.getElementById('new-student-pin').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,4));
  tryExisting();
})();
