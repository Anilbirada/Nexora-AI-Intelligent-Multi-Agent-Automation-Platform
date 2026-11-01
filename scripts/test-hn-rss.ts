import { PermittedRssDiscoverySource } from "../src/lib/projects/agents/hunter/sources/rss-source";

async function probeHN() {
  const sources = [
    { platform: "hackernews_jobs", url: "https://hnrss.org/jobs" },
    { platform: "hackernews_whoishiring", url: "https://hnrss.org/whoishiring" },
  ];

  for (const s of sources) {
    const src = new PermittedRssDiscoverySource(s);
    const start = Date.now();
    const items = await src.fetchListings({ limit: 5 });
    const elapsed = Date.now() - start;
    console.log(`Platform: ${s.platform} | Status: ${items.length > 0 ? "LIVE_CONNECTED" : "FAILED"} | Count: ${items.length} | Latency: ${elapsed}ms`);
    if (items.length > 0) {
      console.log(`Sample: "${items[0].title}" (${items[0].sourceUrl})`);
    }
  }
}

probeHN().catch(console.error);
