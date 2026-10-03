(function(){
  const root=document.getElementById('leaderboard-content');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function run(){
    try{
      const d=await api.get('/student/leaderboard');
      if(!d.has_questions){ root.innerHTML='<div class="notice">目前尚無已結算的週榜資料。</div>'; return; }
      root.innerHTML=`<p class="muted">結算週期：${esc(d.week_start)} ～ ${esc(d.week_end)}</p><div class="table-wrap"><table><thead><tr><th>名次</th><th>學生</th><th>答對題數</th><th>已作答</th><th>正確率</th></tr></thead><tbody>${d.rows.map(x=>`<tr><td>${x.rank}</td><td>${esc(x.display_name)}</td><td>${x.correct_count}</td><td>${x.answered_count}/${x.total_questions}</td><td>${x.accuracy}%</td></tr>`).join('')}</tbody></table></div>`;
    }catch(err){ root.innerHTML='<div class="notice error">'+esc(err.message)+'</div>'; }
  }
  run();
})();
