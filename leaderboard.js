(function(){
  const root=document.getElementById('leaderboard-content');
  const history=document.getElementById('monthly-history-list');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let currentMonth='';
  let activeMonth='';

  function renderHistory(months){
    if(!months.length){
      history.innerHTML='<div class="muted">暫無月份紀錄。</div>';
      return;
    }
    history.innerHTML=months.map((x,i)=>`<button type="button" class="monthly-history-item ${x.month===activeMonth?'active':''}" data-month="${esc(x.month)}">
      <span class="monthly-history-label">${esc(x.label)}</span>
      <span class="monthly-history-kind">${x.month===currentMonth?'本月':'歷史紀錄'}</span>
    </button>`).join('');
    history.querySelectorAll('.monthly-history-item').forEach(btn=>btn.addEventListener('click',()=>load(btn.dataset.month)));
  }

  function renderBoard(d){
    const lead=d.has_questions
      ? '<p class="muted monthly-period">結算月份：'+esc(d.month_label)+'　｜　已結算題目：'+d.settled_questions+' 題</p>'
      : '<p class="notice">這個月份目前沒有已結算的每日題目，因此尚未產生排名。</p>';
    const table=d.has_questions
      ? '<div class="table-wrap"><table class="monthly-table"><thead><tr><th>名次</th><th>學生</th><th>答對題數</th><th>已作答／結算題數</th><th>正確率</th></tr></thead><tbody>'+
        d.rows.map(x=>'<tr><td><span class="rank-number">'+x.rank+'</span></td><td>'+esc(x.display_name)+'</td><td>'+x.correct_count+'</td><td>'+x.answered_count+' / '+x.total_questions+'</td><td>'+x.accuracy+'%</td></tr>').join('')+
        '</tbody></table></div>'
      : '';
    root.innerHTML='<div class="monthly-board-heading"><p class="eyebrow">月度成績</p><h2>'+esc(d.month_label)+' 奮鬥榜</h2></div>'+lead+table+
      '<p class="tiny-note">每位學生只計入每日結算完成的題目；當月排行榜會隨每日結算更新，月份結束後可在左側查閱歷史排名。</p>';
  }

  async function load(month){
    if(month)activeMonth=month;
    root.innerHTML='<div class="muted">正在載入排行榜…</div>';
    try{
      const path='/student/monthly-leaderboard'+(activeMonth?'?month='+encodeURIComponent(activeMonth):'');
      const d=await api.get(path);
      activeMonth=d.month;
      currentMonth=d.months.length?d.months[0].month:d.month;
      renderHistory(d.months);
      renderBoard(d);
    }catch(err){
      root.innerHTML='<div class="notice error">'+esc(err.message||'無法載入每月奮鬥榜。')+'</div>';
    }
  }
  load();
})();
