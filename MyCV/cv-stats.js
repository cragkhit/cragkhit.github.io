/**
 * Citation figures for the Publications section, fetched instead of retyped.
 *
 * Two sources, reached two very different ways:
 *
 *   Scopus   api.elsevier.com answers browsers directly — it echoes the page's
 *            Origin back — so an API key is the only thing needed. Keys are
 *            registered to a site at dev.elsevier.com and Elsevier checks that
 *            registration, so a key made for cragkhit.github.io will not work
 *            from a file:// page.
 *
 *   Scholar  has no API, sends no CORS headers, and answers shared proxies
 *            with "your computer or network may be sending automated queries".
 *            The button therefore calls a relay you deploy yourself — see
 *            tools/scholar-worker.js — which reads the profile server-side and
 *            hands back the two numbers as JSON.
 *
 * The Elsevier key is kept encrypted under the edit password, like the GitHub
 * token; the profile IDs and the relay URL are ordinary config. Nothing here
 * runs for visitors: the buttons exist only in edit mode.
 */
(function () {
  const CFG_KEY = "mycv:stats:config";
  const KEY_KEY = "mycv:stats:elsevier";

  // Seeded from the profiles already linked on the public site, so a new
  // device needs only the relay URL and the API key.
  const DEFAULTS = {
    scholarId: "VArdauUAAAAJ",
    scopusId: "56422351700",
    relay: "",
  };

  const supported = () => typeof fetch === "function";

  /* ---------- config ------------------------------------------------------ */

  function config() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULTS };
  }

  const setConfig = (cfg) => localStorage.setItem(CFG_KEY, JSON.stringify(cfg));

  /* ---------- API key at rest --------------------------------------------- */

  const hasKey = () => !!localStorage.getItem(KEY_KEY);
  const saveKey = async (value, key) =>
    localStorage.setItem(KEY_KEY, await cvAuth.encrypt(value, key));
  const loadKey = (key) => cvAuth.decrypt(localStorage.getItem(KEY_KEY), key);
  const clearKey = () => localStorage.removeItem(KEY_KEY);

  /* ---------- the source label the CV already uses ------------------------ */

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const stamp = (d = new Date()) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const label = (name) => `${name} (${stamp()})`;

  // Both APIs report counts as strings, sometimes with separators.
  function int(v) {
    const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }

  /* ---------- Google Scholar, through the relay --------------------------- */

  async function fetchScholar(cfg = config()) {
    const relay = (cfg.relay || "").trim().replace(/\/+$/, "");
    if (!relay)
      throw new Error("No Scholar relay set — deploy tools/scholar-worker.js, then paste its URL under ⚙.");
    if (!cfg.scholarId) throw new Error("No Google Scholar profile ID set.");

    let res;
    try {
      res = await fetch(`${relay}/scholar?id=${encodeURIComponent(cfg.scholarId)}`, {
        cache: "no-store",
      });
    } catch (e) {
      // A CORS rejection is indistinguishable from a dead host here, so name
      // both — the origin allow-list in the worker is the usual culprit.
      throw new Error("Couldn't reach the relay — check the URL, and that the worker allows this site's origin.");
    }

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || `The relay returned ${res.status}.`);

    const count = int(body?.count);
    const h = int(body?.h);
    if (count === null || h === null)
      throw new Error("The relay answered without citation figures — is the profile public?");
    return { count, h, i10: int(body?.i10), source: label("Google Scholar") };
  }

  /* ---------- Scopus, straight from Elsevier ------------------------------ */

  async function fetchScopus(apiKey, cfg = config()) {
    if (!apiKey) throw new Error("No Elsevier API key — add one under ⚙.");
    if (!cfg.scopusId) throw new Error("No Scopus author ID set.");

    // The key rides in the query string: sending it as X-ELS-APIKey would make
    // this a preflighted request for no gain.
    const url =
      `https://api.elsevier.com/content/author/author_id/${encodeURIComponent(cfg.scopusId)}` +
      `?view=METRICS&httpAccept=application%2Fjson&apiKey=${encodeURIComponent(apiKey)}`;

    let res;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (e) {
      throw new Error("Couldn't reach api.elsevier.com — the key's registered site must match the page you're on.");
    }
    if (!res.ok) throw new Error(explain(res.status, res.headers.get("X-ELS-Status") || ""));

    const json = await res.json().catch(() => null);
    const rec = json?.["author-retrieval-response"]?.[0] || json?.["author-retrieval-response"] || json;
    const core = rec?.coredata || {};

    // Scopus reports both a total and the number of distinct citing documents;
    // the CV carries the total, which is what the author profile page leads on.
    const count = int(core["citation-count"]) ?? int(core["cited-by-count"]);
    const h = int(rec?.["h-index"]);
    if (count === null || h === null)
      throw new Error("Scopus answered without the figures — check the author ID.");
    return { count, h, docs: int(core["document-count"]), source: label("Scopus") };
  }

  function explain(status, els) {
    const tail = els ? ` (${els})` : "";
    if (status === 400) return `Scopus rejected the request${tail} — check the author ID.`;
    if (status === 401)
      return `Elsevier rejected the key${tail} — check it, and that the site it is registered to matches this page.`;
    if (status === 403)
      return `That key is not entitled to the Author Retrieval API from this site${tail}.`;
    if (status === 404) return "No Scopus author with that ID.";
    if (status === 429) return "Elsevier quota reached — try again later.";
    return `Elsevier error ${status}${tail}`;
  }

  window.cvStats = {
    supported, config, setConfig, defaults: () => ({ ...DEFAULTS }),
    hasKey, saveKey, loadKey, clearKey,
    stamp, label, fetchScholar, fetchScopus,
  };
})();
