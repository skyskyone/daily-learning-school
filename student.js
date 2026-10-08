(function(){
  const loginView = document.getElementById('login-view');
  const studentView = document.getElementById('student-view');
  const nameSelect = document.getElementById('student-name');
  const pinInput = document.getElementById('student-pin');
  const loginBtn = document.getElementById('student-login');
  const loginError = document.getElementById('login-error');
  const greeting = document.getElementById('student-greeting');
  const notice = document.getElementById('student-notice');
  const dateEl = document.getElementById('question-date');
  const stateEl = document.getElementById('question-state');
  const textEl = document.getElementById('question-text');
  const optionsEl = document.getElementById('options');
  const answerMessage = document.getElementById('answer-message');
  const logoutBtn = document.getElementById('student-logout');
  let todayData = null;

  const show = (el,msg,type) => { el.textContent = msg || ''; el.className = 'notice ' + (type || '') + (msg ? '' : ' hidden'); };
  const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function loadNames(){
    try{
      const data = await api.get('/public/students');
      nameSelect.innerHTML = '<option value="">請選擇姓名</option>' + data.students.map(s=>`<option value="${escapeHtml(s.display_name)}">${escapeHtml(s.display_name)}</option>`).join('');
    }catch(err){ show(loginError,'目前無法載入學生名冊，請稍後再試。','error'); }
  }

  async function tryExisting(){
    if (api.tokenRole() !== 'student') return false;
    try{
      const data = await api.get('/student/me');
      loginView.classList.add('hidden');
      studentView.classList.remove('hidden');
      greeting.textContent = data.display_name;
      await loadToday();
      return true;
    }catch(_){ api.clearToken(); return false; }
  }

  async function login(){
    show(loginError,'');
    const displayName = nameSelect.value.trim();
    const pin = pinInput.value.trim();
    if (!displayName) return show(loginError,'請先選擇自己的姓名。','error');
    if (!/^\d{4}$/.test(pin)) return show(loginError,'PIN 必須是 4 位數字。','error');
    loginBtn.disabled = true;
    try{
      const data = await api.post('/student/login',{display_name:displayName,pin});
      api.setToken(data.token,'student');
      pinInput.value='';
      loginView.classList.add('hidden');
      studentView.classList.remove('hidden');
      greeting.textContent = data.display_name;
      await loadToday();
    }catch(err){ show(loginError, err.message || '登入失敗。','error'); }
    finally{ loginBtn.disabled = false; }
  }

  function renderQuestion(data){
    todayData = data;
    dateEl.textContent = data.question_date ? formatDate(data.question_date) : '';
    answerMessage.classList.add('hidden');
    optionsEl.innerHTML='';
    if (data.state === 'no_question'){
      stateEl.textContent='今日尚未安排題目'; textEl.textContent='敬候出題。'; return;
    }
    if (data.state === 'not_open'){
      stateEl.textContent = `今日題將於 ${data.publish_time} 開放`;
      textEl.textContent='請稍候片刻，準時入堂。';
      return;
    }
    stateEl.textContent = data.state === 'settled' ? '今日已結算' : '作答時間';
    textEl.textContent = data.question_text;
    [1,2].forEach(n=>{
      const b = document.createElement('button');
      b.className='option-btn' + (data.choice === n ? ' selected' : '');
      b.disabled = data.state !== 'open' || data.answered;
      b.innerHTML = `<span class="option-no">${n===1?'一':'二'}</span><span class="option-copy">${escapeHtml(n===1?data.option1:data.option2)}</span>`;
      b.addEventListener('click',()=>submit(n));
      optionsEl.appendChild(b);
    });
    if (data.state === 'settled'){
      answerMessage.classList.remove('hidden');
      const mine = data.choice ? (data.choice===1?'一':'二') : '未作答';
      const correct = data.correct_option===1?'一':'二';
      answerMessage.innerHTML = `<strong>今日結算：</strong> 你的答案：${mine}　｜　正確答案：${correct}　｜　${data.is_correct?'答對':'答錯/未作答'}`;
    }else if(data.answered){
      answerMessage.classList.remove('hidden');
      answerMessage.textContent='今日已提交答案，結算後才會公布結果。';
    }
  }

  function formatDate(value){
    const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(value || ''));
    return m ? `${m[1]}年${m[2]}月${m[3]}日` : '';
  }

  async function loadToday(){
    try{ renderQuestion(await api.get('/student/today')); }
    catch(err){ if(err.status===401){ api.clearToken(); location.reload(); } else show(notice,err.message,'error'); }
  }

  async function submit(choice){
    if (!todayData || todayData.state !== 'open' || todayData.answered) return;
    optionsEl.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{ await api.post('/student/submit',{choice}); await loadToday(); show(notice,'答案已記錄，請待結算後查看結果。','success'); }
    catch(err){ show(notice,err.message,'error'); await loadToday(); }
  }

  logoutBtn.addEventListener('click',()=>{ api.clearToken(); location.reload(); });
  loginBtn.addEventListener('click',login);
  pinInput.addEventListener('input',()=>{ pinInput.value=pinInput.value.replace(/\D/g,'').slice(0,4); });
  pinInput.addEventListener('keydown',e=>{ if(e.key==='Enter') login(); });
  loadNames();
  tryExisting();
})();
