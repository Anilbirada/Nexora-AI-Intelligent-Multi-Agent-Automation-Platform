/**
 * Live External Source Verification Script
 *
 * Verifies live network connectivity and parsing for configured public RSS feeds:
 * 1. RemoteOK RSS
 * 2. HackerNews "Who is Hiring" RSS
 * 3. WeWorkRemotely RSS
 */

import { PermittedRssDiscoverySource } from "../src/lib/projects/agents/hunter/sources/rss-source";

async function verifyLiveFeeds() {
  console.log("=== NEXGEN GLOBAL AI: Live Feed Verification ===");

  const sources = [
    { platform: "weworkremotely_programming", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss" },
    { platform: "weworkremotely_devops", url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss" },
    { platform: "weworkremotely_fullstack", url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss" },
    { platform: "hackernews_whoishiring", url: "https://hnrss.org/whoishiring" },
  ];

  for (const s of sources) {
    const src = new PermittedRssDiscoverySource(s);
    const start = Date.now();
    const items = await src.fetchListings({ limit: 3 });
    const elapsed = Date.now() - start;

    console.log(`\nPlatform: ${s.platform}`);
    console.log(`URL: ${s.url}`);
    console.log(`Duration: ${elapsed}ms`);
    console.log(`Status: ${items.length > 0 ? "LIVE_CONNECTED" : "NETWORK_RESTRICTED_OR_EMPTY"}`);
    console.log(`Items parsed: ${items.length}`);
    if (items.length > 0) {
      console.log(`Sample item title: "${items[0].title}"`);
      console.log(`Sample item source URL: ${items[0].sourceUrl}`);
      console.log(`Budget detected: ${items[0].budgetMin ?? "None"} - ${items[0].budgetMax ?? "None"} ${items[0].currency}`);
    }
  }
}

verifyLiveFeeds().catch(console.error);
