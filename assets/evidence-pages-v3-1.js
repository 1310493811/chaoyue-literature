function renderDashboard(){
 const qs=inProject(workspace.questions),cs=inProject(workspace.claims),es=inProject(workspace.evidence),gaps=evidenceGaps(),aud=qualityAudit();
 const direct=es.filter(e=>e.strength==='direct').length,conflicts=es.filter(e=>e.direction==='contradicting').length;
 const coverage=cs.length?Math.round(cs.filter(c=>claimScore(c).total>0).length/cs.length*100):0;
 document.getElementById('page-dashboard').innerHTML=header('证据驾驶舱','不是统计“看了多少篇”，而是持续判断：哪些主张已被支持、哪些仍是工作假说、哪些存在冲突。',`<button class="btn primary" onclick="openEvidenceForm()">＋ 新增证据</button><button class="btn" onclick="exportWorkspace()">导出备份</button>`)+projectBanner()+`
 <div class="grid cols-4 section-gap">
  <div class="card metric"><div class="label">核心科学问题</div><div class="value info">${qs.length}</div><div class="delta muted">待关闭 ${qs.filter(q=>q.status!=='closed').length}</div></div>
  <div class="card metric"><div class="label">可检验主张</div><div class="value accent">${cs.length}</div><div class="delta muted">证据覆盖 ${coverage}%</div></div>
  <div class="card metric"><div class="label">直接证据</div><div class="value warn">${direct}</div><div class="delta muted">全部证据 ${es.length}</div></div>
  <div class="card metric"><div class="label">证据缺口</div><div class="value danger">${gaps.length}</div><div class="delta muted">已识别反证 ${conflicts}</div></div>
 </div>
 <div class="grid cols-2 section-gap">
  <div class="card"><div class="card-head"><h3>证据纪律</h3><span>所有结论按三层管理</span></div><div class="discipline">
   <div class="tier"><strong class="support">① 数据直接支持</strong><p>有明确样本、方法、比较、效应方向及局限；能够追溯至原始文献或实验数据。</p></div>
   <div class="tier"><strong style="color:var(--warn)">② 合理推测/工作假说</strong><p>有间接证据或机制合理性，但尚缺关键因果、空间或跨物种验证。</p></div>
   <div class="tier"><strong style="color:var(--danger)">③ 证据不足</strong><p>目前不能下结论；明确记录缺失信息、替代解释及下一步验证。</p></div>
  </div></div>
  <div class="card"><div class="card-head"><h3>数据质量警报</h3><button class="btn small" onclick="go('maintenance')">查看审计</button></div>
   <div class="audit"><div class="audit-box"><span>缺中文题目</span><b>${aud.missingCn}</b></div><div class="audit-box"><span>缺摘要</span><b>${aud.missingAbs}</b></div><div class="audit-box"><span>缺 DOI</span><b>${aud.missingDoi}</b></div><div class="audit-box"><span>疑似译题错配</span><b style="color:var(--danger)">${aud.suspicious}</b></div></div>
   <p class="small muted" style="line-height:1.6;margin-bottom:0">质量警报只用于提示人工核验，不代表算法已经确认错误。当前库中部分中文题目与英文原题明显可能不一致，不能直接用于手稿引用。</p>
  </div>
 </div>
 <div class="grid cols-2 section-gap">
  <div class="card"><div class="card-head"><h3>最需要处理的主张</h3><button class="btn small" onclick="go('claims')">全部主张</button></div><div class="list">${cs.sort((a,b)=>claimScore(a).score-claimScore(b).score).slice(0,4).map(claimMini).join('')||empty('暂无主张')}</div></div>
  <div class="card"><div class="card-head"><h3>近期变更</h3><span>${esc(workspace.updatedAt.slice(0,10))}</span></div><div class="timeline list">${workspace.activity.slice(0,6).map(a=>`<div class="item"><div class="item-title">${esc(a.text)}</div><div class="micro muted">${new Date(a.time).toLocaleString()}</div></div>`).join('')}</div></div>
 </div>`;
}
function claimMini(c){const s=claimScore(c);return `<div class="item claim-card ${scoreClass(s.score)}"><div class="item-row"><div class="item-title">${esc(c.text)}</div><div class="score">${s.score}</div></div><div class="item-meta"><span class="status-pill ${c.status}">${statusLabels[c.status]||c.status}</span><span class="chip">支持权重 ${s.support}</span><span class="chip">反证权重 ${s.oppose}</span></div></div>`}
function empty(t){return `<div class="empty">${t}</div>`}

function renderQuestions(){
 const qs=inProject(workspace.questions);
 document.getElementById('page-questions').innerHTML=header('科学问题','每个问题都必须能够被拆成可证伪主张，并最终由证据或实验决策关闭。',`<button class="btn primary" onclick="openQuestionForm()">＋ 新增问题</button>`)+`
 <div class="two-pane"><div class="list">${qs.map(q=>{const cs=workspace.claims.filter(c=>c.questionId===q.id);const covered=cs.filter(c=>claimScore(c).total>0).length;return `<div class="item"><div class="item-row"><div><div class="item-title">${esc(q.id)} · ${esc(q.title)}</div><div class="item-desc">${esc(q.rationale)}</div></div><span class="status-pill ${q.status==='closed'?'supported':'hypothesis'}">${q.status==='closed'?'已关闭':'待回答'}</span></div><div class="item-meta"><span class="chip">优先级 ${esc(q.priority)}</span><span class="chip">主张 ${cs.length}</span><span class="chip">有证据 ${covered}</span></div><div class="item-actions"><button class="btn small" onclick="openClaimForm(null,'${q.id}')">新增主张</button><button class="btn small ghost" onclick="editQuestion('${q.id}')">编辑</button></div></div>`}).join('')||empty('暂无科学问题')}</div>
 <div class="card sticky"><h3>问题关闭标准</h3><div class="item-desc" style="font-size:13px"><p>1. 核心概念已有操作性定义。</p><p>2. 关键主张至少获得一条直接证据。</p><p>3. 主动检索并处理反证或替代解释。</p><p>4. 方法学与跨物种混杂已记录。</p><p>5. 能形成明确的“支持/不支持/仍不确定”判断。</p></div></div></div>`;
}

function renderClaims(){
 const cs=inProject(workspace.claims);
 document.getElementById('page-claims').innerHTML=header('主张与证据','主张是可被支持或反驳的最小科研判断；置信度由关联证据自动计算，但不能替代人工判断。',`<button class="btn primary" onclick="openClaimForm()">＋ 新增主张</button><button class="btn" onclick="openEvidenceForm()">＋ 新增证据</button>`)+`
 <div class="toolbar"><input id="claimSearch" class="control search" placeholder="搜索主张、备注或问题…" oninput="filterClaims()"><select id="claimStatus" class="control" onchange="filterClaims()"><option value="">全部状态</option>${Object.entries(statusLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
 <div id="claimList" class="list">${cs.map(claimCard).join('')||empty('暂无主张')}</div>`;
}
function claimCard(c){const s=claimScore(c),q=questionById(c.questionId),es=evidenceForClaim(c.id);return `<div class="item claim-card ${scoreClass(s.score)}" data-claim-text="${esc((c.text+' '+c.notes+' '+(q?.title||'')).toLowerCase())}" data-status="${c.status}">
 <div class="item-row"><div style="flex:1"><div class="item-title">${esc(c.text)}</div><div class="item-desc">对应问题：${esc(q?.title||'未关联')}<br>${esc(c.notes||'')}</div></div><div style="text-align:center"><div class="score">${s.score}</div><div class="micro muted">证据分</div></div></div>
 <div class="item-meta"><span class="status-pill ${c.status}">${statusLabels[c.status]||c.status}</span><span class="chip">${es.length} 条证据</span><span class="chip">${s.direct} 条直接证据</span></div>
 <div class="evidence-balance"><div class="balance-box"><span class="support">支持权重</span><strong class="support">${s.support}</strong></div><div class="balance-box"><span class="oppose">反证权重</span><strong class="oppose">${s.oppose}</strong></div></div>
 <div class="item-actions"><button class="btn small primary" onclick="openEvidenceForm('${c.id}')">关联证据</button><button class="btn small" onclick="showClaimDetail('${c.id}')">证据详情</button><button class="btn small ghost" onclick="openClaimForm('${c.id}')">编辑</button></div></div>`}
function filterClaims(){const q=(document.getElementById('claimSearch').value||'').toLowerCase(),s=document.getElementById('claimStatus').value;document.querySelectorAll('#claimList>[data-claim-text]').forEach(x=>x.classList.toggle('hidden',!(x.dataset.claimText.includes(q)&&(!s||x.dataset.status===s))))}
function showClaimDetail(id){const c=claimById(id),es=evidenceForClaim(id),s=claimScore(c);openModal(`<h2>主张证据详情</h2><div class="notice info">${esc(c.text)}</div><div class="grid cols-3 section-gap"><div class="card metric"><div class="label">证据分</div><div class="value ${s.score>=70?'accent':s.score>=50?'warn':'danger'}">${s.score}</div></div><div class="card metric"><div class="label">支持权重</div><div class="value accent">${s.support}</div></div><div class="card metric"><div class="label">反证权重</div><div class="value danger">${s.oppose}</div></div></div><div class="list section-gap">${es.map(evidenceCard).join('')||empty('尚未关联证据')}</div><div class="modal-foot"><button class="btn primary" onclick="closeModal();openEvidenceForm('${id}')">新增证据</button><button class="btn" onclick="closeModal()">关闭</button></div>`)}
function evidenceCard(e){const p=paperById(e.paperId);return `<div class="item evidence-card ${e.direction}"><div class="item-row"><div><div class="item-title">${esc(e.finding)}</div><div class="item-desc">${p?esc(p.title):esc(e.sourceText||'自定义来源')}<br><b>局限：</b>${esc(e.limitation||'未记录')}</div></div><span class="status-pill ${e.direction==='supporting'?'supported':e.direction==='contradicting'?'insufficient':'conflict'}">${directionLabels[e.direction]}</span></div><div class="item-meta"><span class="chip">${strengthLabels[e.strength]}</span><span class="chip">${esc(e.species||'物种未记')}</span><span class="chip">${esc(e.method||'方法未记')}</span><span class="chip">${esc(e.addedDate||'')}</span></div><div class="item-actions"><button class="btn small ghost" onclick="openEvidenceForm('${e.claimId}','${e.id}')">编辑</button><button class="btn small danger" onclick="deleteEvidence('${e.id}')">删除</button></div></div>`}
