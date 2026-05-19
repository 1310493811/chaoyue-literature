/**
 * PubMed 自动检索脚本 v2 — 使用 esummary JSON API
 * 用法: node fetch-papers.js [--dry-run] [--max 50]
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const PAPERS_PATH = path.join(__dirname, "..", "papers.json");
const UPDATE_LOG = path.join(__dirname, "..", "update-log.json");

const DRY_RUN = process.argv.includes("--dry-run");
const MAX_NEW = parseInt(process.argv.find(a => a.startsWith("--max="))?.split("=")[1] || "30", 10);

// ==================== PubMed 搜索策略 ====================
const SEARCH_QUERIES = [
  {
    name: "ruminant_liver_metabolism",
    query: '("liver metabolism"[Title/Abstract] OR "hepatic metabolism"[Title/Abstract] OR "hepatic lipid"[Title/Abstract] OR "liver lipid"[Title/Abstract]) AND (ruminant[All Fields] OR goat[All Fields] OR sheep[All Fields] OR cattle[All Fields] OR bovine[All Fields] OR ovine[All Fields] OR caprine[All Fields] OR herbivore[All Fields] OR dairy[All Fields]) AND ("2024"[Date - Publication] : "2026"[Date - Publication])',
    max: 15,
    tags: ["liver metabolism", "ruminant"],
    importance: "important"
  },
  {
    name: "liver_immunity_herbivore",
    query: '("liver immun"[Title/Abstract] OR "hepatic immun"[Title/Abstract] OR "Kupffer cell"[Title/Abstract] OR "liver inflamm"[Title/Abstract] OR "hepatic inflamm"[Title/Abstract]) AND (ruminant[All Fields] OR goat[All Fields] OR sheep[All Fields] OR cattle[All Fields] OR herbivore[All Fields] OR dairy[All Fields]) AND ("2024"[Date - Publication] : "2026"[Date - Publication])',
    max: 15,
    tags: ["liver immunity", "ruminant"],
    importance: "must-read"
  },
  {
    name: "single_cell_liver_comparative",
    query: '("single-cell"[Title/Abstract] OR "single-nucleus"[Title/Abstract] OR "scRNA-seq"[Title/Abstract] OR "snRNA-seq"[Title/Abstract] OR "single cell transcriptom"[Title/Abstract]) AND (liver[Title/Abstract] OR hepatic[Title/Abstract]) AND (ruminant[All Fields] OR herbivore[All Fields] OR mammal[All Fields] OR comparative[All Fields] OR evolution[All Fields]) AND ("2024"[Date - Publication] : "2026"[Date - Publication])',
    max: 15,
    tags: ["single-cell", "liver", "evolution", "comparative"],
    importance: "must-read"
  },
  {
    name: "bile_acid_gut_liver_ruminant",
    query: '("bile acid"[Title/Abstract] OR "gut-liver axis"[Title/Abstract] OR "gut microbiota"[Title/Abstract] OR "microbiome"[Title/Abstract] OR UDCA[Title/Abstract]) AND (liver[Title/Abstract] OR hepatic[Title/Abstract]) AND (ruminant[All Fields] OR goat[All Fields] OR sheep[All Fields] OR cattle[All Fields] OR bovine[All Fields] OR herbivore[All Fields]) AND ("2024"[Date - Publication] : "2026"[Date - Publication])',
    max: 15,
    tags: ["bile acid", "gut-liver axis", "liver metabolism", "ruminant"],
    importance: "must-read"
  },
  {
    name: "spatial_transcriptomics_liver",
    query: '("spatial transcriptom"[Title/Abstract] OR "spatial multi-omics"[Title/Abstract] OR "spatial metabolom"[Title/Abstract] OR "spatial proteom"[Title/Abstract] OR "STOmics"[Title/Abstract] OR "Visium"[Title/Abstract]) AND (liver[Title/Abstract] OR hepatic[Title/Abstract]) AND ("2024"[Date - Publication] : "2026"[Date - Publication])',
    max: 15,
    tags: ["spatial transcriptomics", "liver", "multi-omics"],
    importance: "must-read"
  },
  {
    name: "liver_evolution_comparative",
    query: '("liver evolut"[Title/Abstract] OR "hepatic evolution"[Title/Abstract] OR "comparative liver"[Title/Abstract] OR "cross-species liver"[Title/Abstract] OR "mammalian liver"[Title/Abstract]) AND (mammal[Title/Abstract] OR vertebrate[Title/Abstract] OR herbivore[Title/Abstract] OR ruminant[Title/Abstract]) AND ("2023"[Date - Publication] : "2026"[Date - Publication])',
    max: 15,
    tags: ["liver", "evolution", "comparative", "cross-species"],
    importance: "must-read"
  },
  {
    name: "CNS_liver_immune_evolution",
    query: '(liver[Title/Abstract] OR hepatic[Title/Abstract]) AND (immun[Title/Abstract] OR macrophage[Title/Abstract] OR "Kupffer"[Title/Abstract]) AND (evolution[Title/Abstract] OR comparative[Title/Abstract] OR cross-species[Title/Abstract] OR mammal[Title/Abstract]) AND ("Nature"[Journal] OR "Science"[Journal] OR "Cell"[Journal] OR "PNAS"[Journal] OR "Cell Reports"[Journal] OR "Nature Communications"[Journal] OR "Science Advances"[Journal]) AND ("2021"[Date - Publication] : "2026"[Date - Publication])',
    max: 10,
    tags: ["CNS", "liver", "immunity", "evolution"],
    importance: "must-read"
  },
  {
    name: "herbivore_liver_detox_adaptation",
    query: '(herbivor[Title/Abstract] OR ruminant[Title/Abstract] OR goat[Title/Abstract] OR sheep[Title/Abstract] OR bovine[Title/Abstract]) AND liver[Title/Abstract] AND (detoxif[Title/Abstract] OR xenobiotic[Title/Abstract] OR "plant secondary" OR "plant toxin" OR CYP[Title/Abstract] OR adaptation[Title/Abstract]) AND ("2020"[Date - Publication] : "2026"[Date - Publication])',
    max: 10,
    tags: ["liver", "detoxification", "herbivore", "adaptation"],
    importance: "important"
  },
  {
    name: "bile_acid_evolution_comparative",
    query: '("bile acid" OR "gut-liver axis" OR "gut microbiota") AND (evolut[Title/Abstract] OR compar[Title/Abstract] OR cross-species[Title/Abstract] OR herbivor[Title/Abstract] OR mammal[Title/Abstract]) AND ("2020"[Date - Publication] : "2026"[Date - Publication])',
    max: 10,
    tags: ["bile acid", "evolution", "gut-liver axis", "comparative"],
    importance: "must-read"
  }
];

// ==================== PubMed API ====================
function pubmedFetch(pathname) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "eutils.ncbi.nlm.nih.gov",
      path: pathname,
      headers: { "User-Agent": "ChaoyueLitBot/1.0 (caochaoyue@example.com)" }
    };
    https.get(opts, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        resolve(data);
      });
    }).on("error", reject);
  });
}

async function searchPubMed(query, maxResults) {
  console.log(`  🔍 ${query.substring(0, 80)}...`);
  const res = await pubmedFetch(
    `/entrez/eutils/esearch.fcgi?db=pubmed&retmax=${maxResults}&sort=relevance&retmode=json&term=${encodeURIComponent(query)}`
  );
  const ids = JSON.parse(res).esearchresult?.idlist || [];
  console.log(`     → ${ids.length} PMIDs`);
  return ids;
}

async function fetchSummaries(pmids) {
  if (!pmids.length) return [];
  const res = await pubmedFetch(
    `/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json`
  );
  const data = JSON.parse(res);
  const results = data.result || {};
  const uids = results.uids || [];
  return uids.map(uid => results[uid]).filter(Boolean);
}

// esummary JSON → paper 格式
function summaryToPaper(summary, source) {
  const authors = [];
  if (summary.authors) {
    for (const a of summary.authors) {
      authors.push(a.name);
      if (authors.length >= 6) { authors.push("et al."); break; }
    }
  }

  return {
    id: String(summary.uid || ""),
    title: summary.title || "",
    authors: authors.join(", ") || "Multiple",
    journal: summary.source || summary.fulljournalname || "Unknown",
    year: parseInt(summary.pubdate?.split(" ")[0] || "0", 10) || new Date().getFullYear(),
    volume: summary.volume || "",
    issue: summary.issue || "",
    pages: summary.pages || summary.elocationid || "",
    doi: summary.elocationid?.replace(/^doi:\s*/i, "") || "",
    pmid: String(summary.uid || ""),
    abstract: "",  // esummary 不含摘要，需要时再补充
    keywords: [],
    pdf_url: "#",
    article_url: `https://pubmed.ncbi.nlm.nih.gov/${summary.uid}/`,
    pmc_url: summary.pubmedcentrallink || "#",
    tags: source.tags,
    importance: source.importance,
    added_date: new Date().toISOString().split("T")[0]
  };
}

// ==================== 数据管理 ====================
function loadPapers() {
  return JSON.parse(fs.readFileSync(PAPERS_PATH, "utf-8"));
}

function savePapers(data) {
  data.last_updated = new Date().toISOString().split("T")[0];
  data.total_count = data.papers.length;
  data.must_read_count = data.papers.filter(p => p.importance === "must-read").length;

  if (DRY_RUN) {
    console.log(`\n📋 [DRY RUN] 将新增 ${data.total_count - loadPapers().total_count} 篇`);
  } else {
    fs.writeFileSync(PAPERS_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`\n✅ papers.json 已更新 (${data.total_count} 篇, ${data.must_read_count} 篇必读)`);
  }
}

function loadUpdateLog() {
  try { return JSON.parse(fs.readFileSync(UPDATE_LOG, "utf-8")); }
  catch { return { runs: [] }; }
}
function saveUpdateLog(log) {
  fs.writeFileSync(UPDATE_LOG, JSON.stringify(log, null, 2), "utf-8");
}

// ==================== 主流程 ====================
async function main() {
  console.log("🦞 超越文献库 · PubMed 自动检索 v2");
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log(`📋 ${SEARCH_QUERIES.length} 组查询 | 最多新增 ${MAX_NEW} 篇`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN}\n`);

  const data = loadPapers();
  const existingIds = new Set(data.papers.map(p => p.id || p.pmid));
  console.log(`📚 已有 ${data.papers.length} 篇文献\n`);

  const allNew = [];
  const runLog = { time: new Date().toISOString(), queries: {}, totalNew: 0, errors: [] };

  for (const sq of SEARCH_QUERIES) {
    if (allNew.length >= MAX_NEW) {
      console.log(`⚠️ 已达上限 ${MAX_NEW} 篇`);
      break;
    }

    console.log(`\n--- ${sq.name} ---`);
    try {
      const ids = await searchPubMed(sq.query, sq.max);
      // 过滤已有
      const newIds = ids.filter(id => !existingIds.has(String(id)));
      runLog.queries[sq.name] = { found: ids.length, newCandidates: newIds.length, added: 0 };

      if (newIds.length === 0) {
        console.log("  ✨ 无新文献");
        continue;
      }

      console.log(`  📄 新候选: ${newIds.length} 篇，拉取摘要...`);

      // 批量拉摘要 (esummary)
      const batchSize = 20;
      for (let i = 0; i < newIds.length && allNew.length < MAX_NEW; i += batchSize) {
        const batch = newIds.slice(i, i + batchSize);
        const summaries = await fetchSummaries(batch);

        for (const sm of summaries) {
          if (allNew.length >= MAX_NEW) break;
          const uid = String(sm.uid);
          if (existingIds.has(uid)) continue;
          if (!sm.title) continue;

          const paper = summaryToPaper(sm, sq);
          existingIds.add(uid);
          allNew.push(paper);
          runLog.queries[sq.name].added++;

          const mustFlag = paper.importance === "must-read" ? "🔴" : "📄";
          console.log(`  ${mustFlag} [${paper.importance}] ${paper.title.substring(0, 75)}`);
        }

        // 速率限制
        if (i + batchSize < newIds.length) {
          await new Promise(r => setTimeout(r, 350));
        }
      }
    } catch (e) {
      console.log(`  ❌ 错误: ${e.message}`);
      runLog.errors.push(`${sq.name}: ${e.message}`);
    }

    // 请求间距
    await new Promise(r => setTimeout(r, 400));
  }

  runLog.totalNew = allNew.length;
  console.log(`\n📊 本次新增: ${allNew.length} 篇`);

  if (allNew.length > 0) {
    data.papers = [...allNew, ...data.papers];
    savePapers(data);

    const allTags = [...new Set(allNew.flatMap(p => p.tags))];
    console.log(`🏷️  覆盖标签: ${allTags.join(", ")}`);
  } else {
    console.log("✨ 没有新文献，已是最新");
  }

  // 更新日志
  const log = loadUpdateLog();
  log.runs.unshift(runLog);
  if (log.runs.length > 50) log.runs.length = 50;
  saveUpdateLog(log);

  console.log("\n🎉 完成！");
}

main().catch(e => {
  console.error("❌ 致命错误:", e);
  process.exit(1);
});
