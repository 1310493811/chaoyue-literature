const https = require("https");
function fetch(pathname) {
  return new Promise((resolve, reject) => {
    https.get({hostname:"eutils.ncbi.nlm.nih.gov",path:pathname,headers:{"User-Agent":"CLit/1.0"}}, res => {
      let d=""; res.on("data",c=>d+=c); res.on("end",()=>resolve(d));
    }).on("error",reject);
  });
}
async function main() {
  const q = '(liver[Title/Abstract] OR hepatic[Title/Abstract]) AND (ruminant[All Fields] OR goat[All Fields] OR herbivore[All Fields]) AND ("2025/01/01"[Date - Publication] : "2026/05/19"[Date - Publication])';
  const s = await fetch("/entrez/eutils/esearch.fcgi?db=pubmed&retmax=5&sort=date&retmode=json&term="+encodeURIComponent(q));
  const result = JSON.parse(s);
  console.log("Total results:", result.esearchresult.count);
  const ids = result.esearchresult.idlist;
  console.log("PMIDs returned:", ids);
  if(ids.length>0) {
    const f = await fetch("/entrez/eutils/efetch.fcgi?db=pubmed&id="+ids.slice(0,3).join(",")+"&retmode=xml&rettype=abstract");
    // Check if ArticleTitle tags are present
    const titleMatches = f.match(/<ArticleTitle>/g);
    const pmidMatches = f.match(/<PMID[ >]/g);
    console.log("ArticleTitle tags found:", titleMatches ? titleMatches.length : 0);
    console.log("PMID tags found:", pmidMatches ? pmidMatches.length : 0);
    // Print first title
    const m = /<ArticleTitle>([^<]+)<\/ArticleTitle>/.exec(f);
    if (m) console.log("First title:", m[1]);
    else console.log("NO TITLE FOUND in XML");
  }
}
main().catch(e=>console.error(e));
