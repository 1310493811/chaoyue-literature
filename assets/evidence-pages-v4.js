const V4_SPECIES=['牛','羊/山羊','猪','人','鼠','其他'];
const V4_CORE_SPECIES=['牛','羊/山羊','猪','人'];
const v4BaseEnsureWorkspaceShape=ensureWorkspaceShape;
ensureWorkspaceShape=function(){
  v4BaseEnsureWorkspaceShape();
  if(!Array.isArray(workspace.reviewerNotes))workspace.reviewerNotes=[];
  workspace.version=4.0;
};
const v4BaseUpdateBadges=updateBadges;
updateBadges=function(){
  v4BaseUpdateBadges();
  const set=(id,n)=>{const el=document.getElementById(id);if(el)el.textContent=n};
  const used=new Set(inProject(workspace.evidence).flatMap(e=>evidenceSpeciesKeys(e)).filter(x=>x!=='未注明'));
  set('nSpecies',used.size);
  set('nReview',reviewerIssues().filter(x=>x.severity==='critical'||x.severity==='major').length);
};
const v4BaseRenderPage=renderPage;
renderPage=function(page){
  if(page==='species')return renderSpeciesMatrix();
  if(page==='reviewer')return renderReviewer();
  return v4BaseRenderPage(page);
};

function evidenceSpeciesKeys(e){
  const t=String(e?.species||'').trim().toLowerCase();
  if(!t)return ['未注明'];
  const keys=[];
  if(/牛|cattle|bovine|cow/.test(t))keys.push('牛');
  if(/羊|sheep|ovine|goat|caprine/.test(t))keys.push('羊/山羊');
  if(/猪|pig|swine|porcine/.test(t))keys.push('猪');
  if(/人|human|patient|donor/.test(t))keys.push('人');
  if(/鼠|mouse|mice|murine|rat|rodent/.test(t))keys.push('鼠');
  if(!keys.length)keys.push('其他');
  return [...new Set(keys)];
}
function speciesEvidenceForClaim(claimId,species){
  return evidenceForClaim(claimId).filter(e=>evidenceSpeciesKeys(e).includes(species));
}
function speciesCellStats(claimId,species){
  const es=speciesEvidenceForClaim(claimId,species);
  return {total:es.length,direct:es.filter(e=>e.strength==='direct').length,support:es.filter(e=>e.direction==='supporting').length,oppose:es.filter(e=>e.direction==='contradicting').length,context:es.filter(e=>e.direction==='context').length};
}
function allSpeciesSummary(){
  const out={};V4_SPECIES.forEach(s=>out[s]={total:0,direct:0,claims:new Set()});
  inProject(workspace.evidence).forEach(e=>evidenceSpeciesKeys(e).forEach(s=>{if(!out[s])out[s]={total:0,direct:0,claims:new Set()};out[s].total++;if(e.strength==='direct')out[s].direct++;out[s].claims.add(e.claimId)}));
  return out;
}
function speciesMatrixAudit(){
  const evidence=inProject(workspace.evidence),present=new Set(evidence.flatMap(e=>evidenceSpeciesKeys(e))),missing=V4_CORE_SPECIES.filter(s=>!present.has(s));
  const unspecified=evidence.filter(e=>evidenceSpeciesKeys(e).includes('未注明')).length;
  const incomplete=evidence.filter(e=>!String(e.sample||'').trim()||!String(e.method||'').trim()).length;
  const narrow=inProject(workspace.claims).filter(c=>new Set(evidenceForClaim(c.id).flatMap(e=>evidenceSpeciesKeys(e)).filter(s=>s!=='未注明')).size<=1&&evidenceForClaim(c.id).length>0);
  return {present,missing,unspecified,incomplete,narrow};
}
function renderSpeciesMatrix(){
  const claims=inProject(workspace.claims),summary=allSpeciesSummary(),audit=speciesMatrixAudit();
  document.getElementById('page-species').innerHTML=header('跨物种证据矩阵','矩阵按“主张 × 物种”汇总证据数量、直接证据和反证。它用于检查物种覆盖与可比性，不把不同研究条件下的结果自动视为可直接比较。',`<button class="btn" onclick="exportSpeciesMatrix()">导出矩阵</button><button class="btn primary" onclick="openEvidenceForm()">＋ 新增证据</button>`)+`
  <div class="scope-warning">跨物种比较必须同时核对健康状态、年龄、性别、饲粮、采样部位、空腹/餐后状态、技术平台、批次和统计口径。矩阵中的“有证据”不等于“证据可比”。</div>
  <div class="species-summary section-gap">${V4_SPECIES.map(s=>`<div class="species-card"><span>${esc(s)}</span><b>${summary[s]?.total||0}</b><span>直接证据 ${summary[s]?.direct||0} · 覆盖主张 ${summary[s]?.claims?.size||0}</span></div>`).join('')}</div>
  <div class="grid cols-2 section-gap"><div class="card"><div class="card-head"><h3>覆盖审计</h3><span>核心比较：牛、羊/山羊、猪、人</span></div><div class="coverage-strip"><div class="audit-box"><span>已覆盖核心物种</span><b>${V4_CORE_SPECIES.filter(s=>audit.present.has(s)).length}/4</b></div><div class="audit-box"><span>缺失核心物种</span><b style="color:var(--danger)">${audit.missing.length}</b></div><div class="audit-box"><span>物种未注明</span><b>${audit.unspecified}</b></div><div class="audit-box"><span>方法/样本字段不全</span><b>${audit.incomplete}</b></div></div>${audit.missing.length?`<div class="notice danger section-gap">缺失：${audit.missing.map(esc).join('、')}</div>`:''}</div><div class="card"><div class="card-head"><h3>范围过窄的主张</h3><span>${audit.narrow.length} 条</span></div><div class="list">${audit.narrow.slice(0,4).map(c=>`<div class="item"><div class="item-title">${esc(c.text)}</div><div class="item-desc">当前证据仅覆盖一个物种，不能支持广泛跨物种外推。</div></div>`).join('')||empty('暂无')}</div></div></div>
  <div class="card section-gap matrix-wrap"><table class="matrix species-matrix"><thead><tr><th style="min-width:360px">可检验主张</th>${V4_SPECIES.map(s=>`<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>${claims.map(c=>`<tr><td><div class="paper-title">${esc(c.text)}</div><div class="item-meta"><span class="status-pill ${c.status}">${statusLabels[c.status]||c.status}</span><span class="chip">证据分 ${claimScore(c).score}</span></div></td>${V4_SPECIES.map(s=>speciesCell(c,s)).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function speciesCell(c,s){
  const x=speciesCellStats(c.id,s);if(!x.total)return `<td><div class="matrix-cell empty-cell"><div class="cell-main">0</div><div class="cell-sub">暂无证据</div></div></td>`;
  return `<td><div class="matrix-cell ${x.direct?'has-direct':''} ${x.oppose?'has-conflict':''}" onclick="showSpeciesEvidence('${c.id}','${s}')"><div class="cell-main">${x.total}</div><div class="cell-sub"><span class="support-dot">支持 ${x.support}</span> · <span class="conflict-dot">反证 ${x.oppose}</span><br>直接证据 ${x.direct}</div></div></td>`;
}
function showSpeciesEvidence(claimId,species){
  const c=claimById(claimId),es=speciesEvidenceForClaim(claimId,species);
  openModal(`<h2>${esc(species)}证据</h2><div class="notice info">${esc(c?.text||'')}</div><div class="list section-gap">${es.map(evidenceCard).join('')||empty('暂无证据')}</div><div class="modal-foot"><button class="btn primary" onclick="closeModal();openEvidenceForm('${claimId}')">新增证据</button><button class="btn" onclick="closeModal()">关闭</button></div>`);
}
function exportSpeciesMatrix(){
  const rows=[['claim_id','claim','status',...V4_SPECIES]];
  inProject(workspace.claims).forEach(c=>rows.push([c.id,c.text,c.status,...V4_SPECIES.map(s=>{const x=speciesCellStats(c.id,s);return `total=${x.total};direct=${x.direct};support=${x.support};oppose=${x.oppose}`})]));
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');download(`跨物种证据矩阵_${today()}.csv`,csv,'text/csv;charset=utf-8');
}

function reviewerMetrics(){
  const claims=inProject(workspace.claims),evidence=inProject(workspace.evidence),experiments=inProject(workspace.experiments),figures=figuresInProject();
  const pct=(n,d)=>d?Math.round(n/d*100):0;
  const claimCoverage=pct(claims.filter(c=>claimScore(c).total>0).length,claims.length);
  const directCoverage=pct(claims.filter(c=>claimScore(c).direct>0).length,claims.length);
  const counterCoverage=pct(claims.filter(c=>claimScore(c).conflicts>0).length,claims.length);
  const evidenceQuality=pct(evidence.filter(e=>String(e.method||'').trim()&&String(e.sample||'').trim()&&String(e.limitation||'').trim()).length,evidence.length);
  const present=new Set(evidence.flatMap(e=>evidenceSpeciesKeys(e)));const speciesCoverage=pct(V4_CORE_SPECIES.filter(s=>present.has(s)).length,V4_CORE_SPECIES.length);
  const causalReadiness=pct(experiments.filter(e=>e.claimId&&String(e.decisionRule||'').trim()&&String(e.nextAction||'').trim()).length,experiments.length);
  const figureReadiness=figures.length?Math.round(figures.reduce((a,f)=>a+figureReadiness(f),0)/figures.length):0;
  const overall=Math.round(claimCoverage*.18+directCoverage*.2+counterCoverage*.1+evidenceQuality*.17+speciesCoverage*.15+causalReadiness*.1+figureReadiness*.1);
  return {claimCoverage,directCoverage,counterCoverage,evidenceQuality,speciesCoverage,causalReadiness,figureReadiness,overall};
}
function reviewerIssues(){
  if(!workspace)return [];
  const issues=[],claims=inProject(workspace.claims),evidence=inProject(workspace.evidence),experiments=inProject(workspace.experiments),figures=typeof figuresInProject==='function'?figuresInProject():[],edges=inProject(workspace.graphEdges||[]);
  claims.forEach(c=>{const s=claimScore(c);if(!s.total)issues.push({severity:c.importance==='critical'?'critical':'major',category:'证据覆盖',title:'核心主张尚无证据',detail:c.text,action:'先建立证据卡；无法检索到证据时应明确标记为证据缺口。'});else if(!s.direct)issues.push({severity:'major',category:'直接证据',title:'主张缺少直接证据',detail:c.text,action:'补充直接回答该主张的数据，或降低结论强度。'});if(s.total&&!s.conflicts)issues.push({severity:'minor',category:'反证处理',title:'尚未记录反证',detail:c.text,action:'主动检索相反结果、边界条件和替代解释。'});const species=new Set(evidenceForClaim(c.id).flatMap(e=>evidenceSpeciesKeys(e)).filter(x=>x!=='未注明'));if(/跨物种|反刍|物种|进化|猪|人/.test(c.text)&&species.size<3)issues.push({severity:'major',category:'跨物种外推',title:'物种覆盖不足以支持广泛外推',detail:`${c.text}（当前覆盖 ${species.size} 个物种类别）`,action:'补充关键对照物种并统一采样与统计口径。'});if(/导致|驱动|决定|因果|证明|证实/.test(c.text)&&!s.direct)issues.push({severity:'critical',category:'因果表述',title:'因果措辞超过证据强度',detail:c.text,action:'改为“相关、提示或可能”，并设计干预、阻断与回补。'});});
  if(evidence.length){const incomplete=evidence.filter(e=>!String(e.method||'').trim()||!String(e.sample||'').trim()||!String(e.limitation||'').trim());if(incomplete.length)issues.push({severity:incomplete.length/evidence.length>.35?'major':'minor',category:'证据质量',title:'证据卡关键字段不完整',detail:`${incomplete.length}/${evidence.length} 条缺少方法、样本或局限字段。`,action:'回到原文核对样本量、比较、统计和外推边界。'});}
  experiments.forEach(e=>{if(!e.claimId||!String(e.decisionRule||'').trim())issues.push({severity:'major',category:'实验设计',title:'实验未绑定主张或缺预先判定规则',detail:e.title,action:'明确实验回答哪个主张，以及支持/不支持的判定标准。'});});
  figures.forEach(f=>{const r=figureReadiness(f);if(f.status==='ready'&&r<70)issues.push({severity:'critical',category:'论文结构',title:'Figure 状态与证据成熟度不一致',detail:`Figure ${f.order} ${f.title}：成熟度 ${r}%`,action:'降低状态或补齐其关联主张的直接证据。'});else if(r<50)issues.push({severity:'major',category:'论文结构',title:'Figure 论证链较弱',detail:`Figure ${f.order} ${f.title}：成熟度 ${r}%`,action:'检查这张图是否过早进入故事线。'});});
  edges.filter(e=>e.status==='supported').forEach(e=>{const c=claimById(e.claimId);if(!c||claimScore(c).score<65)issues.push({severity:'major',category:'机制图谱',title:'“已有支持”的关系缺乏足够证据',detail:`${e.source} —${e.relation}→ ${e.target}`,action:'将成熟度降为工作假说，或补充绑定主张和直接证据。'});});
  return issues;
}
function claimSafeWording(c){
  const s=claimScore(c),text=c.text.replace(/[。；;]+$/,'');
  if(c.status==='method')return `本研究将“${text}”作为方法学判定原则，用于约束后续分析与结论边界。`;
  if(!s.total)return `我们提出“${text}”这一工作假说，但目前尚无直接证据支持。`;
  if(!s.direct)return `现有间接证据提示“${text}”的可能性，但尚不足以建立因果关系。`;
  if(s.conflicts)return `现有数据总体支持“${text}”，但相反证据提示该结论可能受情境或方法条件限制。`;
  if(s.score>=75)return `现有数据支持“${text}”；该结论仍应限定在当前样本、物种和实验条件范围内。`;
  return `现有结果提示“${text}”，仍需更多直接证据和独立验证。`;
}
function reviewerNote(){let n=workspace.reviewerNotes.find(x=>x.projectId===currentProject);if(!n){n={projectId:currentProject,novelty:0,significance:0,broadImpact:0,conceptualAdvance:0,decision:'重大修改',summary:'',updatedAt:''};workspace.reviewerNotes.push(n)}return n}
function reviewScoreOptions(v){return `<option value="0" ${Number(v)===0?'selected':''}>未判断</option>`+[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(v)===n?'selected':''}>${n}/5</option>`).join('')}
function renderReviewer(){
  const m=reviewerMetrics(),issues=reviewerIssues(),note=reviewerNote(),critical=issues.filter(x=>x.severity==='critical').length,major=issues.filter(x=>x.severity==='major').length;
  const dims=[['主张证据覆盖',m.claimCoverage],['直接证据覆盖',m.directCoverage],['反证处理',m.counterCoverage],['证据卡完整度',m.evidenceQuality],['核心物种覆盖',m.speciesCoverage],['因果验证准备',m.causalReadiness],['Figure成熟度',m.figureReadiness]];
  document.getElementById('page-reviewer').innerHTML=header('顶刊审稿自检','这是基于工作区结构的自动审查，不评价真实生物学重大性，也不能替代领域专家、统计学家和正式同行评议。',`<button class="btn" onclick="exportReviewerReport()">导出审查报告</button>`)+`
  <div class="grid cols-2"><div class="card"><div class="review-overall"><div class="review-dial" style="--score:${m.overall}"><strong>${m.overall}</strong><span>结构成熟度</span></div><div><h3>当前判定：${critical?'存在致命缺口':major?'需要重大修改':'结构基本完整'}</h3><p class="item-desc">致命问题 ${critical} 项，重大问题 ${major} 项。该分数衡量证据结构完整度，不是论文接收概率。</p></div></div></div><div class="card"><div class="card-head"><h3>人工判断</h3><span>重大性和创新性必须人工评估</span></div><div class="review-note-grid"><div class="field"><label>新颖性</label><select id="rNovelty">${reviewScoreOptions(note.novelty)}</select></div><div class="field"><label>科学重大性</label><select id="rSignificance">${reviewScoreOptions(note.significance)}</select></div><div class="field"><label>广泛影响</label><select id="rImpact">${reviewScoreOptions(note.broadImpact)}</select></div><div class="field"><label>概念突破</label><select id="rConcept">${reviewScoreOptions(note.conceptualAdvance)}</select></div></div><div class="field section-gap"><label>当前决策</label><select id="rDecision"><option ${note.decision==='暂不推进'?'selected':''}>暂不推进</option><option ${note.decision==='重大修改'?'selected':''}>重大修改</option><option ${note.decision==='可进入机制验证'?'selected':''}>可进入机制验证</option><option ${note.decision==='可准备手稿'?'selected':''}>可准备手稿</option></select></div><div class="field section-gap"><label>人工审稿总结</label><textarea id="rSummary">${esc(note.summary||'')}</textarea></div><div class="item-actions"><button class="btn primary" onclick="saveReviewerNote()">保存人工判断</button></div></div></div>
  <div class="review-score-grid section-gap">${dims.map(([k,v])=>`<div class="review-score"><span>${k}</span><b class="${v>=70?'support':v<40?'oppose':''}">${v}%</b><div class="progress"><i style="width:${v}%"></i></div></div>`).join('')}</div>
  <div class="grid cols-2 section-gap"><div class="card"><div class="card-head"><h3>审稿问题清单</h3><span>${issues.length} 项</span></div><div class="list">${issues.map(reviewIssueCard).join('')||empty('未检测到结构性问题')}</div></div><div class="card"><div class="card-head"><h3>安全论文表述</h3><span>根据证据强度自动降级措辞</span></div><div class="list">${inProject(workspace.claims).map(c=>`<div class="wording-box"><div class="micro muted">${esc(c.id)} · 证据分 ${claimScore(c).score}</div>${esc(claimSafeWording(c))}</div>`).join('')}</div></div></div>`;
}
function reviewIssueCard(x){return `<div class="item review-issue ${x.severity}"><div class="item-row"><div class="item-title">${esc(x.title)}</div><span class="severity ${x.severity}">${x.severity==='critical'?'致命':x.severity==='major'?'重大':'次要'}</span></div><div class="item-meta"><span class="chip">${esc(x.category)}</span></div><div class="item-desc">${esc(x.detail)}<br><b>建议：</b>${esc(x.action)}</div></div>`}
function saveReviewerNote(){const n=reviewerNote();n.novelty=Number(document.getElementById('rNovelty').value);n.significance=Number(document.getElementById('rSignificance').value);n.broadImpact=Number(document.getElementById('rImpact').value);n.conceptualAdvance=Number(document.getElementById('rConcept').value);n.decision=document.getElementById('rDecision').value;n.summary=document.getElementById('rSummary').value.trim();n.updatedAt=new Date().toISOString();save('更新顶刊审稿人工判断');renderReviewer()}
function exportReviewerReport(){
  const m=reviewerMetrics(),issues=reviewerIssues(),n=reviewerNote(),lines=[`# ${getProject().title}：顶刊审稿自检报告`,'',`生成日期：${today()}`,'','## 一、结构成熟度',`- 总体结构成熟度：${m.overall}%`,`- 主张证据覆盖：${m.claimCoverage}%`,`- 直接证据覆盖：${m.directCoverage}%`,`- 反证处理：${m.counterCoverage}%`,`- 证据卡完整度：${m.evidenceQuality}%`,`- 核心物种覆盖：${m.speciesCoverage}%`,`- 因果验证准备：${m.causalReadiness}%`,`- Figure成熟度：${m.figureReadiness}%`,'','## 二、人工判断',`- 新颖性：${n.novelty||'未判断'}/5`,`- 科学重大性：${n.significance||'未判断'}/5`,`- 广泛影响：${n.broadImpact||'未判断'}/5`,`- 概念突破：${n.conceptualAdvance||'未判断'}/5`,`- 当前决策：${n.decision}`,`- 总结：${n.summary||'未填写'}`,'','## 三、主要问题'];
  issues.forEach((x,i)=>lines.push(`${i+1}. **${x.title}**（${x.category}；${x.severity}）`,`   - 依据：${x.detail}`,`   - 建议：${x.action}`));
  lines.push('','## 四、建议表述');inProject(workspace.claims).forEach(c=>lines.push(`- ${c.id}：${claimSafeWording(c)}`));
  lines.push('','> 注：本报告仅进行证据结构审查，不能替代生物学重大性、统计有效性和正式同行评议。');download(`顶刊审稿自检_${today()}.md`,lines.join('\n'),'text/markdown;charset=utf-8');
}
