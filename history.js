(function(){
  const root=document.getElementById('history-content');
  const auth=document.getElementById('history-auth');
  const notice=document.getElementById('history-notice');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function run(){
    if(api.tokenRole()!=='student'){
      auth.textContent='請先從首頁登入學生身份。';
      auth.className='notice error';
      root.innerHTML='<p><a href="index.html">回登入頁</a></p>';
      return;
    }
    try{
      const d=await api.get('/student/history');
      if(!d.items.length){
        root.innerHTML='<div class="empty-state">目前尚無已結算的作答紀錄。</div>';
        return;
      }
      const rows=d.items.map(function(x){
        return '<tr>'+
          '<td>'+esc(x.question_date)+'</td>'+
          '<td>'+esc(x.question_text)+'</td>'+
          '<td>'+(x.choice?esc(x.choice===1?'一':'二'):'未作答')+'</td>'+
          '<td>'+esc(x.correct_option===1?'一':'二')+'</td>'+
          '<td><span class="badge '+(x.is_correct?'ok':'no')+'">'+(x.is_correct?'答對':'答錯/未作答')+'</span></td>'+
        '</tr>';
      }).join('');
      root.innerHTML=
        '<div class="history-summary">以下只顯示你自己的已結算作答紀錄。</div>'+
        '<div class="table-wrap"><table><thead><tr><th>日期</th><th>題目</th><th>你的答案</th><th>正確答案</th><th>結果</th></tr></thead><tbody>'+
        rows+
        '</tbody></table></div>';
    }catch(err){
      if(err.status===401){
        api.clearToken();
        location.href='index.html';
        return;
      }
      notice.textContent=err.message||'無法取得作答紀錄。';
      notice.className='notice error';
    }
  }

  document.getElementById('history-logout').addEventListener('click',function(){
    api.clearToken();
    location.href='index.html';
  });

  run();
})();
