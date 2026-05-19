/**
 * 改造 index.html：将硬编码 PAPERS_DATA 改为动态加载 papers.json
 */
const fs = require("fs");
const path = require("path");

const HTML_PATH = path.join(__dirname, "..", "index.html");

// 备份
const bakPath = HTML_PATH + ".bak";
if (!fs.existsSync(bakPath)) {
  fs.copyFileSync(HTML_PATH, bakPath);
  console.log("✅ 已备份: index.html.bak");
}

let html = fs.readFileSync(HTML_PATH, "utf-8");

// 找到 PAPERS_DATA 定义的起始和结束
const startMarker = "const PAPERS_DATA = [";
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error("❌ 找不到 PAPERS_DATA");
  process.exit(1);
}

// 找到匹配的 ];
// 需要从 const PAPERS_DATA = [ 开始找到对应的 ];
let depth = 0;
let endIdx = -1;
let inString = false;
let stringChar = "";
for (let i = startIdx; i < html.length; i++) {
  const ch = html[i];
  const prev = html[i - 1];

  if (!inString) {
    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; }
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
  } else {
    if (ch === stringChar && prev !== '\\') { inString = false; }
  }
}

if (endIdx === -1) {
  console.error("❌ 找不到 PAPERS_DATA 结束位置");
  process.exit(1);
}

console.log(`📏 PAPERS_DATA: ${startIdx} → ${endIdx} (${endIdx - startIdx} chars)`);

// 替换：将 hardcoded PAPER_DATA 改为动态加载
const replacement = `// ===== 文献数据（动态加载 papers.json）=====
let PAPERS_DATA = [];
let PAPERS_LOADED = false;

async function loadPapers() {
  if (PAPERS_LOADED) return;
  try {
    const resp = await fetch('papers.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    PAPERS_DATA = (data.papers || []).map(p => ({
      id: p.id || p.pmid || '',
      title: p.title || '',
      title_cn: p.title_cn || '',
      authors: p.authors || 'Multiple',
      journal: p.journal || 'Unknown',
      impact_factor: 0,
      year: p.year || 0,
      doi: p.doi || '',
      pmid: p.id || p.pmid || '',
      abstract: p.abstract || '',
      abstract_cn: p.abstract_cn || '',
      keywords: p.keywords || [],
      tags: p.tags || [],
      article_url: p.article_url || '',
      pmc_url: p.pmc_url || '#',
      importance: p.importance || 'important',
      added_date: p.added_date || '',
      relevance_score: 0
    }));
    PAPERS_LOADED = true;
    console.log('📚 已加载 ' + PAPERS_DATA.length + ' 篇文献');
  } catch(e) {
    console.error('加载 papers.json 失败:', e);
    document.getElementById('library-count').textContent = '加载失败';
  }
}`;

html = html.substring(0, startIdx) + replacement + html.substring(endIdx);

// 修改 init 函数，加入 await loadPapers
html = html.replace(
  "function init() {",
  "async function init() {\n  await loadPapers();\n  if (!PAPERS_DATA.length) { document.getElementById('library-results').innerHTML = '<div class=\"empty-state\"><div class=\"emoji\">📭</div><p>加载文献失败，请刷新重试</p></div>'; return; }"
);

// 修改 filterLibrary 中的 filterLibrary count（library 模式显示筛选后的数量，但我们保留总数）
// 同时修改 library-count 在加载时的行为

fs.writeFileSync(HTML_PATH, html, "utf-8");
console.log("✅ index.html 已改造为动态加载 papers.json");
console.log("📄 现在会从 papers.json 读取文献数据，自动同步");
