// v3.5 AI辅助科研工作流模块
// 目标：把论文阅读、知识图谱和Figure规划连接起来。

function renderIntake(){
 document.getElementById('page-intake').innerHTML=header('结构化导入','将PDF阅读结果转换为证据卡。当前版本提供结构模板，后续可接入AI解析接口。',`<button class="btn primary" onclick="openIntakeForm()">＋ 新建阅读记录</button>`)+`
 <div class="card notice info">推荐流程：上传论文 → 提取研究问题 → 记录实验设计 → 标注关键发现 → 判断证据等级 → 关联主张。</div>
 <div class="grid cols-2 section-gap"><div class="card"><h3>AI阅读输出标准</h3><div class="item-desc"><p>① Scientific question（科学问题）</p><p>② Experimental design（实验设计）</p><p>③ Key finding（关键发现）</p><p>④ Evidence strength（证据强度）</p><p>⑤ Limitation（局限与替代解释）</p></div></div><div class="card"><h3>当前待处理</h3><div class="item-desc">${workspace.intake?.length||0} 条阅读任务。下一阶段可接入PDF解析和自动证据抽取。</div></div></div>`;
}

function renderKnowledge(){
 const nodes=[
  ['瘤胃菌群','微生物生态'],['代谢物','乙酸/丁酸/LPS'],['门静脉','暴露入口'],['肝脏空间区','汇管区-中央区'],['Kupffer细胞','免疫适应'],['代谢通路','NRF2/cGAS-STING']
 ];
 document.getElementById('page-knowledge').innerHTML=header('机制知识图谱','把跨学科关系从文字笔记升级为可追踪网络。节点需要由证据卡支撑。',`<button class="btn" onclick="alert('下一阶段接入可视化图谱引擎')">扩展图谱</button>`)+`
 <div class="card"><div class="graph-flow">${nodes.map((n,i)=>`<div class="item"><div class="item-title">${n[0]}</div><div class="item-desc">${n[1]}</div>${i<nodes.length-1?'<div class="muted">↓</div>':''}</div>`).join('')}</div></div>
 <div class="notice">注意：知识图谱展示的是假说结构，不等于因果链。每条连接必须回溯到证据卡。</div>`;
}

function renderFigures(){
 const figs=[
  ['Figure 1','反刍动物肝脏单细胞/空间图谱','回答：是否存在特殊空间免疫结构'],
  ['Figure 2','门静脉暴露谱跨物种比较','回答：是否存在反刍动物特征暴露'],
  ['Figure 3','候选细胞状态与代谢通路','回答：哪些机制轴值得深入'],
  ['Figure 4','功能验证实验','回答：是否具有因果关系'],
  ['Figure 5','进化解释模型','回答：是否形成新生物学概念']
 ];
 document.getElementById('page-figures').innerHTML=header('论文与 Figure 规划','从科学问题反推图，而不是从已有数据拼图。适用于 Nature/Science 类论文结构设计。')+
 `<div class="list">${figs.map(f=>`<div class="item"><div class="item-title">${f[0]} · ${f[1]}</div><div class="item-desc">${f[2]}</div></div>`).join('')}</div>`;
}

function openIntakeForm(){
 openModal(`<h2>新建结构化阅读记录</h2><div class="form-grid"><div class="field full"><label>论文/主题</label><input id="intakeTitle"></div><div class="field full"><label>核心发现</label><textarea id="intakeFinding"></textarea></div><div class="field full"><label>局限</label><textarea id="intakeLimit"></textarea></div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="saveIntake()">保存</button></div>`)
}
function saveIntake(){
 if(!workspace.intake)workspace.intake=[];
 workspace.intake.push({id:uid('INT'),title:document.getElementById('intakeTitle').value,finding:document.getElementById('intakeFinding').value,limitation:document.getElementById('intakeLimit').value,time:new Date().toISOString()});
 save('新增结构化阅读记录');closeModal();renderIntake();
}

const oldRenderPage=renderPage;
renderPage=function(p){
 if(p==='intake')return renderIntake();
 if(p==='knowledge')return renderKnowledge();
 if(p==='figures')return renderFigures();
 return oldRenderPage(p);
}
