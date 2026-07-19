const STORAGE_KEY='researchEvidenceWorkspace.v3';
const WEIGHTS={direct:3,indirect:2,context:1};
const strengthLabels={direct:'直接证据',indirect:'间接证据',context:'背景证据'};
const directionLabels={supporting:'支持',contradicting:'反证',context:'背景/边界'};
const statusLabels={hypothesis:'工作假说',supported:'已有支持',insufficient:'证据不足',method:'方法学约束',conflict:'证据冲突'};
let PAPERS=[];
let workspace=null;
let currentProject='ruminant-liver';
let currentPage='dashboard';

const SEED={
 version:3,
 updatedAt:new Date().toISOString(),
 projects:[
  {id:'ruminant-liver',title:'瘤胃共生压力与反刍动物肝脏免疫代谢适应',status:'active',role:'负责人',description:'以牛为核心，结合反刍动物参照与非反刍动物对照，解析门静脉暴露、肝脏空间细胞状态及其可验证机制。'},
  {id:'muscle-adipose',title:'肌肉细胞因子蛋白研究',status:'transferred',role:'本人退出',description:'已于2026年7月移交师弟负责，不再列入当前在研课题。'}
 ],
 questions:[
  {id:'Q1',projectId:'ruminant-liver',title:'如何操作性定义并量化“瘤胃共生压力”？',priority:'critical',status:'open',rationale:'必须把宏大概念转化为可测量变量，明确组成、通量、时间尺度与参考范围。'},
  {id:'Q2',projectId:'ruminant-liver',title:'反刍动物与单胃动物的门静脉暴露谱是否存在稳健差异？',priority:'critical',status:'open',rationale:'需区分浓度、通量、采样状态、饲粮、年龄及物种效应。'},
  {id:'Q3',projectId:'ruminant-liver',title:'哪些肝脏空间细胞状态与门静脉暴露相关？',priority:'high',status:'open',rationale:'重点关注汇管区—中央区轴、免疫细胞生态位及肝细胞代谢分区。'},
  {id:'Q4',projectId:'ruminant-liver',title:'观察到的差异能否被解释为反刍动物适应或进化特征？',priority:'high',status:'open',rationale:'必须排除饮食、年龄、组织处理、平台和细胞组成差异，并补充系统发育证据。'},
  {id:'Q5',projectId:'ruminant-liver',title:'哪一条候选轴最适合进行因果机制验证？',priority:'high',status:'open',rationale:'由发现型图谱收束至1–2条可干预、可回补、具有空间定位的机制轴。'}
 ],
 claims:[
  {id:'C1',projectId:'ruminant-liver',questionId:'Q1',text:'“瘤胃共生压力”应由门静脉来源分子暴露的组成、通量、波动和宿主反应共同定义，而不能仅以单一浓度指标替代。',status:'method',importance:'critical',notes:'建议建立RSPI时区分暴露指标与宿主响应指标，避免循环定义。'},
  {id:'C2',projectId:'ruminant-liver',questionId:'Q2',text:'健康反刍动物可能具有区别于猪和人的门静脉代谢物及微生物相关分子暴露模式。',status:'hypothesis',importance:'critical',notes:'目前只能作为待验证假说，不能直接表述为“牛羊门静脉有害物质更高”。'},
  {id:'C3',projectId:'ruminant-liver',questionId:'Q3',text:'长期门静脉暴露可能塑造汇管区附近的耐受性免疫状态和肝细胞代谢适应。',status:'hypothesis',importance:'high',notes:'需空间共定位、剂量关联和功能干预三类证据。'},
  {id:'C4',projectId:'ruminant-liver',questionId:'Q4',text:'跨物种表达差异只有在排除技术与生态混杂并获得系统发育支持后，才可上升为适应性进化解释。',status:'method',importance:'critical',notes:'这是结论边界，不是生物学结果。'},
  {id:'C5',projectId:'ruminant-liver',questionId:'Q5',text:'候选机制轴必须同时满足空间特异、暴露响应、跨物种一致性和因果可干预性。',status:'method',importance:'high',notes:'用于机制候选排序。'}
 ],
 evidence:[],
 paperState:{},
 experiments:[
  {id:'E1',projectId:'ruminant-liver',claimId:'C2',title:'门静脉暴露跨物种证据表',stage:'design',type:'evidence-synthesis',decisionRule:'仅纳入健康、采样口径可比且报告绝对浓度或可换算数据的研究；分开记录浓度与通量。',nextAction:'建立牛、羊、猪、人四物种字段字典并开始文献核验。'},
  {id:'E2',projectId:'ruminant-liver',claimId:'C3',title:'牛肝脏单核与空间转录组发现队列',stage:'idea',type:'omics',decisionRule:'若候选状态不能在空间上重复定位，或不能与门静脉暴露关联，则不进入机制验证。',nextAction:'明确样本来源、肝叶位置、采样时间、年龄、性别、饲粮和批次。'}
 ],
 activity:[{id:'A1',time:new Date().toISOString(),text:'初始化动态证据库结构'}]
};

function deepClone(x){return JSON.parse(JSON.stringify(x))}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function today(){return new Date().toISOString().slice(0,10)}
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function getProject(){return workspace.projects.find(x=>x.id===currentProject)||workspace.projects[0]}
function inProject(arr){return arr.filter(x=>x.projectId===currentProject)}
function record(text){workspace.activity.unshift({id:uid('A'),time:new Date().toISOString(),text});workspace.activity=workspace.activity.slice(0,80)}
function save(msg='更新工作区'){
 workspace.updatedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace));
 document.getElementById('lastSaved').textContent='已保存 '+new Date().toLocaleString();record(msg);localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace));updateBadges();
}
function load(){
 try{const raw=localStorage.getItem(STORAGE_KEY);workspace=raw?JSON.parse(raw):deepClone(SEED)}catch(e){workspace=deepClone(SEED)}
 if(!workspace.version||workspace.version<3) workspace=deepClone(SEED);
 if(!workspace.paperState) workspace.paperState={};
 if(!workspace._legacyMigrated){
  try{const oldStatus=JSON.parse(localStorage.getItem('lit-statuses')||'{}');const oldNotes=JSON.parse(localStorage.getItem('lit-notes')||'{}');Object.keys({...oldStatus,...oldNotes}).forEach(id=>workspace.paperState[id]={read:!!oldStatus[id]?.read,note:oldNotes[id]||oldStatus[id]?.note||''});workspace._legacyMigrated=true;localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace))}catch(e){}
 }
 currentProject=workspace.projects.some(p=>p.id===currentProject)?currentProject:workspace.projects[0].id;
}
async function loadPapers(){try{const r=await fetch('papers.json',{cache:'no-store'});const d=await r.json();PAPERS=d.papers||[]}catch(e){console.error(e);PAPERS=[]}}
function paperById(id){return PAPERS.find(p=>String(p.id)===String(id))}
function questionById(id){return workspace.questions.find(x=>x.id===id)}
function claimById(id){return workspace.claims.find(x=>x.id===id)}
function evidenceForClaim(id){return workspace.evidence.filter(e=>e.claimId===id)}
function claimScore(claim){
 const es=evidenceForClaim(claim.id);let support=0,oppose=0;
 es.forEach(e=>{const w=WEIGHTS[e.strength]||1;if(e.direction==='supporting')support+=w;if(e.direction==='contradicting')oppose+=w});
 const raw=support-oppose;const score=Math.max(0,Math.min(100,Math.round(50+raw*9)));
 return {score,support,oppose,total:es.length,direct:es.filter(e=>e.strength==='direct').length,conflicts:es.filter(e=>e.direction==='contradicting').length};
}
function scoreClass(n){return n>=70?'score-high':n>=50?'score-mid':'score-low'}
function evidenceGaps(){
 return inProject(workspace.claims).map(c=>{const s=claimScore(c);let reasons=[];
  if(s.total===0) reasons.push('尚未关联证据');
  if(s.direct===0) reasons.push('缺少直接证据');
  if(s.conflicts===0&&s.total>0) reasons.push('尚未主动检索反证');
  if(c.status==='hypothesis') reasons.push('仍为工作假说');
  return {claim:c,score:s,reasons};
 }).filter(x=>x.reasons.length);
}
function qualityAudit(){
 const missingCn=PAPERS.filter(p=>!p.title_cn).length;
 const missingAbs=PAPERS.filter(p=>!p.abstract&&!p.abstract_cn).length;
 const missingDoi=PAPERS.filter(p=>!p.doi).length;
 const suspicious=PAPERS.filter(p=>p.title_cn&&p.title&&titleMismatchHeuristic(p)).length;
 return {missingCn,missingAbs,missingDoi,suspicious};
}
function titleMismatchHeuristic(p){
 const en=(p.title||'').toLowerCase(),cn=p.title_cn||'';
 const maps=[['microbiota','微生物'],['liver','肝'],['single-cell','单细胞'],['bile acid','胆汁酸'],['cattle','牛'],['sheep','羊']];
 let checked=0,miss=0;maps.forEach(([a,b])=>{if(en.includes(a)){checked++;if(!cn.includes(b))miss++}});return checked>=1&&miss===checked;
}
function updateProjectSelect(){
 const s=document.getElementById('projectSelect');s.innerHTML=workspace.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===currentProject?'selected':''}>${esc(p.title)}${p.status==='transferred'?'（已移交）':''}</option>`).join('')
}
function updateBadges(){
 const set=(id,n)=>{const el=document.getElementById(id);if(el)el.textContent=n};
 set('nQuestions',inProject(workspace.questions).length);set('nClaims',inProject(workspace.claims).length);set('nPapers',PAPERS.length);set('nGaps',evidenceGaps().length);set('nExperiments',inProject(workspace.experiments).length)
}
function switchProject(id){currentProject=id;renderAll();go('dashboard')}
function go(page){currentPage=page;document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+page).classList.add('active');document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===page));renderPage(page);location.hash=page}
function renderAll(){updateProjectSelect();updateBadges();renderPage(currentPage)}
function renderPage(p){({dashboard:renderDashboard,questions:renderQuestions,claims:renderClaims,papers:renderPapers,gaps:renderGaps,experiments:renderExperiments,maintenance:renderMaintenance}[p]||renderDashboard)()}
function header(title,desc,buttons=''){return `<div class="topbar"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${buttons}</div></div>`}
function projectBanner(){const p=getProject();return `<div class="notice ${p.status==='transferred'?'danger':'info'}"><b>${esc(p.title)}</b> · <span class="status-pill ${p.status}">${p.status==='active'?'当前在研':'已移交/本人退出'}</span><br>${esc(p.description)}</div>`}
