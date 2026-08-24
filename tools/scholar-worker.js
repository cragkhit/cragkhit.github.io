/**
 * scholar-worker.js — the relay behind MyCV's "Google Scholar" button.
 *
 * Google Scholar has no API and sends no CORS headers, so a page on
 * cragkhit.github.io cannot read a profile itself. This Worker does the read
 * server-side and returns just the two figures the CV shows, with the CORS
 * header the browser needs.
 *
 *   GET /scholar?id=VArdauUAAAAJ
 *   → { "id": "…", "count": 1204, "h": 17, "i10": 25,
 *       "since": { "count": 612, "h": 14, "i10": 18 },
 *       "fetchedAt": "2026-08-24T…Z", "cached": false }
 *
 * fetchedAt is when the profile was really read — on a cache hit that is
 * older than the request, and it is what MyCV stamps the source line with.
 *
 * Deploy (dashboard route, no tooling needed):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Start with Hello World
 *   2. Name it e.g. cv-stats, Deploy, then Edit code and paste this file over
 *      the template. Deploy again.
 *   3. Paste the worker URL (https://cv-stats.<subdomain>.workers.dev) into
 *      MyCV → edit mode → Publications → ⚙.
 * Or with wrangler: `npx wrangler deploy tools/scholar-worker.js --name cv-stats`.
 *
 * Scholar rate-limits repeat readers, so responses are cached for half an hour
 * and the endpoint only serves profile IDs — it is not a general proxy.
 */

// Origins allowed to call this worker. Add a dev origin here if you serve
// MyCV locally; the first entry is what a non-matching caller is told.
const ALLOWED = [
  "https://cragkhit.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

const CACHE_SECONDS = 1800;
const PROFILE = (id) => `https://scholar.google.com/citations?hl=en&user=${id}`;

// A plain desktop UA: Scholar serves a stripped page to anything that reads
// like a script, and the stats table is the first thing it drops.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
      Vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "86400" },
      });
    }
    if (request.method !== "GET") return json({ error: "GET only" }, 405, cors);

    const url = new URL(request.url);
    if (!/^\/scholar\/?$/.test(url.pathname)) return json({ error: "Not found" }, 404, cors);

    const id = url.searchParams.get("id") || "";
    if (!/^[A-Za-z0-9_-]{6,24}$/.test(id))
      return json({ error: "Expected ?id= a Google Scholar profile ID." }, 400, cors);

    let res;
    try {
      res = await fetch(PROFILE(id), {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      });
    } catch (e) {
      return json({ error: "Couldn't reach Google Scholar." }, 502, cors);
    }

    const html = await res.text();
    if (res.status === 404) return json({ error: `No Scholar profile ${id}.` }, 404, cors);
    if (!res.ok || blocked(html))
      return json(
        { error: "Google Scholar is refusing automated reads right now — try again in a few minutes." },
        502,
        cors
      );

    const stats = parse(html);
    if (!stats)
      return json(
        { error: "Read the profile but found no citation table — it may be private." },
        502,
        cors
      );

    // On a cache hit the profile HTML can be up to CACHE_SECONDS old, so the
    // read time is upstream's Date header rather than this moment — that is
    // the timestamp the CV ends up carrying.
    const read = Date.parse(res.headers.get("Date") || "");
    return json(
      {
        id,
        ...stats,
        fetchedAt: new Date(Number.isFinite(read) ? read : Date.now()).toISOString(),
        cached: res.headers.get("CF-Cache-Status") === "HIT",
      },
      200,
      { ...cors, "Cache-Control": `public, max-age=${CACHE_SECONDS}` }
    );
  },
};

const blocked = (html) =>
  /unusual traffic|automated queries|not a robot|\/sorry\//i.test(html);

// The profile's summary table is six cells: citations, h-index and i10-index,
// each as an all-time figure followed by a recent-years one.
function parse(html) {
  const nums = [...html.matchAll(/gsc_rsb_std"?>(\d[\d,]*)</g)].map((m) =>
    parseInt(m[1].replace(/,/g, ""), 10)
  );
  if (nums.length < 6) return null;
  const [count, countSince, h, hSince, i10, i10Since] = nums;
  return { count, h, i10, since: { count: countSince, h: hSince, i10: i10Since } };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
