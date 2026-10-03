(function(){
  const root=document.getElementById('history-content');
  const auth=document.getElementById('history-auth');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function run(){
    if(api.tokenRole()!=='student'){ auth.textContent='請先從首頁登入學生身份。'; auth.className='notice error'; root.innerHTML='<p><a href="index.html">回登入頁</a></p>'; return; }
    try{
      const d=await api.get('/student/history');
      if(!d.items.length){ root.innerHTML='<p class="muted">目前尚無已結算紀錄。</p>'; return; }
      root.innerHTML='<div class="table-wrap"><table><thead><tr><th>日期</th><th>題目</th><th>你的答案</th><th>正確答案</th><th>結果</th></tr></thead><tbody>'+d.items.map(x=>`<tr><td>${esc(x.question_date)}</td><td>${esc(x.question_text)}</td><td>${x.choice?esc(x.choice===1?'一':'二'):'未作答'}</td><td>${esc(x.correct_option===1?'一':'二')}</td><td><span class="badge ${x.is_correct?'ok':'no'}">${x.is_correct?'答對':'答錯'}</span></td></tr>`).join('')+'</tbody></table></div>';
    }catch(err){ if(err.status===401){api.clearToken();location.href='index.html';return;} root.innerHTML='<div class="notice error">'+esc(err.message)+'</div>'; }
  }
  run();
})();
