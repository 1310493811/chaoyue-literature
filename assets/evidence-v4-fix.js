// v4.0 runtime corrections kept separate to avoid mutating existing user data.
function reviewerMetrics(){
  const claims=inProject(workspace.claims),evidence=inProject(workspace.evidence),experiments=inProject(workspace.experiments),figures=figuresInProject();
  const pct=(n,d)=>d?Math.round(n/d*100):0;
  const claimCoverage=pct(claims.filter(c=>claimScore(c).total>0).length,claims.length);
  const directCoverage=pct(claims.filter(c=>claimScore(c).direct>0).length,claims.length);
  const counterCoverage=pct(claims.filter(c=>claimScore(c).conflicts>0).length,claims.length);
  const evidenceQuality=pct(evidence.filter(e=>String(e.method||'').trim()&&String(e.sample||'').trim()&&String(e.limitation||'').trim()).length,evidence.length);
  const present=new Set(evidence.flatMap(e=>evidenceSpeciesKeys(e)));
  const speciesCoverage=pct(V4_CORE_SPECIES.filter(s=>present.has(s)).length,V4_CORE_SPECIES.length);
  const causalReadiness=pct(experiments.filter(e=>e.claimId&&String(e.decisionRule||'').trim()&&String(e.nextAction||'').trim()).length,experiments.length);
  const figureScore=figures.length?Math.round(figures.reduce((a,f)=>a+figureReadiness(f),0)/figures.length):0;
  const overall=Math.round(claimCoverage*.18+directCoverage*.2+counterCoverage*.1+evidenceQuality*.17+speciesCoverage*.15+causalReadiness*.1+figureScore*.1);
  return {claimCoverage,directCoverage,counterCoverage,evidenceQuality,speciesCoverage,causalReadiness,figureReadiness:figureScore,overall};
}
