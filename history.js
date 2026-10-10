(function(){
  const root=document.getElementById('history-content');
  const auth=document.getElementById('history-auth');
  const notice=document.getElementById('history-notice');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const answer=v=>v?(v===1?'一':'二'):'未作答';
  const dateLabel=v=>String(v||'').replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$1年$2月$3日');

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
        const result=x.choice?(x.is_correct?'答對':'答錯'):'未作答';
        const resultClass=x.is_correct?'ok':'no';
        return {
          table:'<tr>'+
            '<td>'+esc(dateLabel(x.question_date))+'</td>'+
            '<td class="history-question-cell">'+esc(x.question_text)+'</td>'+
            '<td>'+esc(answer(x.choice))+'</td>'+
            '<td>'+esc(answer(x.correct_option))+'</td>'+
            '<td><span class="badge '+resultClass+'">'+result+'</span></td>'+
          '</tr>',
          card:'<article class="history-card">'+
            '<div class="history-card-head"><span class="history-card-date">'+esc(dateLabel(x.question_date))+'</span><span class="badge '+resultClass+'">'+result+'</span></div>'+
            '<div class="history-card-question">'+esc(x.question_text)+'</div>'+
            '<div class="history-card-answers">'+
              '<div><span>你的答案</span><strong>'+esc(answer(x.choice))+'</strong></div>'+
              '<div><span>正確答案</span><strong>'+esc(answer(x.correct_option))+'</strong></div>'+
            '</div>'+
          '</article>'
        };
      });
      root.innerHTML=
        '<div class="history-summary">以下只顯示你自己的已結算作答紀錄。</div>'+
        '<div class="table-wrap history-table-wrap"><table class="history-table"><thead><tr><th>日期</th><th>題目</th><th>你的答案</th><th>正確答案</th><th>結果</th></tr></thead><tbody>'+
        rows.map(x=>x.table).join('')+
        '</tbody></table></div>'+
        '<div class="history-cards">'+rows.map(x=>x.card).join('')+'</div>';
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
