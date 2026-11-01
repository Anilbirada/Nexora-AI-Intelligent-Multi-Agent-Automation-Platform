import { PermittedRssDiscoverySource } from "../src/lib/projects/agents/hunter/sources/rss-source";

async function probeSources() {
  console.log("=== Probing Discovery Feeds ===");

  const candidates = [
    { platform: "weworkremotely_programming", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss" },
    { platform: "weworkremotely_devops", url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss" },
    { platform: "weworkremotely_fullstack", url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss" },
    { platform: "jobspresso", url: "https://jobspresso.co/feed/" },
    { platform: "remoteok", url: "https://remoteok.com/remote-jobs.rss" },
    { platform: "remotepython", url: "https://www.remotepython.com/jobs/rss/" },
  ];

  for (const c of candidates) {
    const src = new PermittedRssDiscoverySource(c);
    const start = Date.now();
    const items = await src.fetchListings({ limit: 5 });
    const elapsed = Date.now() - start;

    console.log(`\nPlatform: ${c.platform}`);
    console.log(`URL: ${c.url}`);
    console.log(`Duration: ${elapsed}ms`);
    console.log(`Status: ${items.length > 0 ? "LIVE_CONNECTED" : "FAILED_OR_EMPTY"}`);
    console.log(`Count: ${items.length}`);
    if (items.length > 0) {
      console.log(`Sample: "${items[0].title}"`);
    }
  }
}

probeSources().catch(console.error);
