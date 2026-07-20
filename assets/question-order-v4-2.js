// v4.2：调整科学问题主线顺序，并迁移已有浏览器工作区。
function reorderDefaultResearchQuestions(target){
  if(!target||!Array.isArray(target.questions)||!Array.isArray(target.claims))return;
  const projectId='ruminant-liver';
  const qs=target.questions.filter(q=>q.projectId===projectId);
  const portal=qs.find(q=>/门静脉暴露谱/.test(q.title||''));
  const atlas=qs.find(q=>/肝脏空间细胞状态|空间.*图谱|单细胞.*空间/.test(q.title||''));
  const definition=qs.find(q=>/操作性定义|量化.*瘤胃共生压力/.test(q.title||''));
  const evolution=qs.find(q=>/适应或进化特征/.test(q.title||''));
  const mechanism=qs.find(q=>/候选轴|因果机制验证/.test(q.title||''));
  const ordered=[portal,atlas,definition,evolution,mechanism].filter(Boolean);
  if(ordered.length<3)return;

  const oldToNew={};
  ordered.forEach((q,i)=>{oldToNew[q.id]=`Q${i+1}`;q.id=`__QUESTION_TMP_${i+1}__`;});
  target.claims.forEach(c=>{if(oldToNew[c.questionId])c.questionId=oldToNew[c.questionId];});
  ordered.forEach((q,i)=>{q.id=`Q${i+1}`;});

  const others=target.questions.filter(q=>q.projectId!==projectId||!ordered.includes(q));
  target.questions=[...ordered,...others];
  target._questionOrderV42=true;
}

reorderDefaultResearchQuestions(SEED);
const questionOrderBaseEnsure=ensureWorkspaceShape;
ensureWorkspaceShape=function(){
  questionOrderBaseEnsure();
  if(!workspace._questionOrderV42)reorderDefaultResearchQuestions(workspace);
  workspace.version=4.2;
};
