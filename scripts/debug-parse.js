const https = require("https");
const fs = require("fs");

function fetch(pathname) {
  return new Promise((resolve, reject) => {
    https.get({hostname:"eutils.ncbi.nlm.nih.gov",path:pathname,headers:{"User-Agent":"CLit/1.0"}}, res => {
      let d=""; res.on("data",c=>d+=c); res.on("end",()=>resolve(d));
    }).on("error",reject);
  });
}

function decodeEntities(str) {
  return str.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
}

function parseArticles(xml) {
  const articles = [];
  let current = null;
  let authorList = [];
  let inAbstract = false;
  let inPubDate = false;

  const lines = xml.split("\n");
  let articleCount = 0;
  let hasArticleTitle = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/<PubmedArticle>/.test(line)) { current = {}; authorList = []; articleCount++; }
    else if (/<\/PubmedArticle>/.test(line)) {
      if (current) {
        if (authorList.length) current.authors = authorList.join(", ");
        articles.push(current);
      }
      current = null; authorList = [];
    }
    else if (current && /<PMID[ >]/.test(line)) {
      const m = />(\d+)</.exec(line);
      if (m) current.pmid = m[1];
    }
    else if (current && /<ArticleTitle>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) {
        current.title = decodeEntities(m[1]);
        hasArticleTitle = true;
      }
    }
    else if (current && /<ISOAbbreviation>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.journal = decodeEntities(m[1]);
    }
    else if (current && /<Title>(?!.*ArticleTitle)/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.journal_full = decodeEntities(m[1]);
    }
    else if (current && /<PubDate>/.test(line)) { inPubDate = true; }
    else if (current && /<\/PubDate>/.test(line)) { inPubDate = false; }
    else if (current && inPubDate && /<Year>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.year = parseInt(m[1], 10);
    }
    else if (current && /<Volume>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.volume = m[1];
    }
    else if (current && /<Issue>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.issue = m[1];
    }
    else if (current && /<MedlinePgn>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.pages = m[1];
    }
    else if (current && /<ELocationID[^>]*EIdType="doi"/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) current.doi = m[1];
    }
    else if (current && /<Keyword[ >]/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) {
        if (!current.keywords) current.keywords = [];
        current.keywords.push(decodeEntities(m[1]).toLowerCase());
      }
    }
    else if (current && /<AbstractText/.test(line)) {
      inAbstract = true;
      current.abstract = "";
      const m = />(.*)$/.exec(line);
      if (m) current.abstract += decodeEntities(m[1]).trim();
    }
    else if (current && /<\/AbstractText>/.test(line)) { inAbstract = false; }
    else if (current && inAbstract) {
      const clean = line.replace(/<[^>]+>/g, "").trim();
      if (clean) current.abstract += " " + decodeEntities(clean);
    }
    else if (current && /<LastName>/.test(line)) {
      const m = />([^<]+)/.exec(line);
      if (m) authorList.push(decodeEntities(m[1]));
    }
  }

  console.log(`  Article tags: ${articleCount} | Has ArticleTitle: ${hasArticleTitle}`);
  // Filter
  const valid = articles.filter(a => a.title && a.pmid);
  console.log(`  Valid papers: ${valid.length} / ${articles.length}`);
  return valid;
}

async function main() {
  const q = '("liver metabolism"[Title/Abstract] OR "hepatic metabolism"[Title/Abstract]) AND (ruminant[All Fields] OR goat[All Fields] OR sheep[All Fields] OR cattle[All Fields] OR bovine[All Fields] OR ovine[All Fields] OR caprine[All Fields] OR herbivore[All Fields] OR dairy[All Fields]) AND ("2024"[Date - Publication] : "2026"[Date - Publication])';

  // Search
  const sRes = await fetch("/entrez/eutils/esearch.fcgi?db=pubmed&retmax=10&sort=relevance&retmode=json&term="+encodeURIComponent(q));
  const searchResult = JSON.parse(sRes);
  const ids = searchResult.esearchresult.idlist;
  console.log("Total count:", searchResult.esearchresult.count);
  console.log("Returned IDs:", ids);

  if (ids.length === 0) { console.log("No results"); return; }

  // Fetch
  const xml = await fetch("/entrez/eutils/efetch.fcgi?db=pubmed&id="+ids.join(",")+"&retmode=xml&rettype=abstract");

  // Parse
  const articles = parseArticles(xml);

  // Check against existing
  const existing = JSON.parse(fs.readFileSync(__dirname + "/../papers.json", "utf-8"));
  const seenIds = new Set(existing.papers.map(p => p.id || p.pmid));
  console.log("\nExisting PMIDs:", [...seenIds].slice(0,5), "...");
  console.log("\nNew papers:");
  for (const a of articles) {
    console.log(`  PMID: ${a.pmid} | EXISTS: ${seenIds.has(a.pmid)} | Title: ${a.title?.substring(0,60)}`);
  }

  const newPapers = articles.filter(a => !seenIds.has(a.pmid));
  console.log(`\nWould add: ${newPapers.length} new papers`);
}

main().catch(e => console.error(e));
