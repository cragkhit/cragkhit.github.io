/**
 * Shared between the two sync paths (fs-sync.js, gh-sync.js): turns the CV
 * object into the two files that live in the repo, and guards against a save
 * that would silently drop data.
 *
 *   cv-data.json  canonical — what the editor reads and writes
 *   cv-data.js    generated — a `window.DEFAULT_CV = …` assignment, kept so
 *                 the public pages can load the data with a plain script tag
 */
(function () {
  /* ---------- cv-data.js: mirror the hand-written style ------------------- */

  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const key = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k));

  function inline(v) {
    if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
    if (isObj(v))
      return `{ ${Object.entries(v).map(([k, x]) => `${key(k)}: ${inline(x)}`).join(", ")} }`;
    return JSON.stringify(v);
  }

  // Arrays always break unless short and primitive-only; objects stay inline
  // below the top two levels, so each publication lands on a single line.
  function ser(v, depth, indent) {
    const pad = "  ".repeat(indent);
    const padIn = "  ".repeat(indent + 1);

    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      const allPrim = v.every((x) => !isObj(x) && !Array.isArray(x));
      if (allPrim && inline(v).length <= 70) return inline(v);
      const parts = v.map(
        (x) =>
          padIn +
          (isObj(x) || Array.isArray(x) ? ser(x, depth + 1, indent + 1) : JSON.stringify(x))
      );
      return `[\n${parts.join(",\n")}\n${pad}]`;
    }

    if (isObj(v)) {
      if (depth >= 2) return inline(v);
      const parts = Object.entries(v).map(
        ([k, x]) => `${padIn}${key(k)}: ${ser(x, depth + 1, indent + 1)}`
      );
      return `{\n${parts.join(",\n")}\n${pad}}`;
    }

    return JSON.stringify(v);
  }

  // Note the header: this file is generated on every save, so a comment added
  // inside it by hand would be lost on the next edit. Edit cv-data.json.
  function serialize(cv) {
    return (
      "// Generated from cv-data.json — do not edit by hand.\n" +
      "// Rewritten in full by MyCV on every save (MyCV/cv-serialize.js);\n" +
      "// edits made here, including comments, are overwritten.\n" +
      "// pubStats holds only citation figures; the journal/conference/workshop/\n" +
      "// chapter counts are derived from `publications` at render time.\n" +
      `window.DEFAULT_CV = ${ser(cv, 0, 0)};\n`
    );
  }

  const serializeJson = (cv) => JSON.stringify(cv, null, 2) + "\n";

  // Parses the generated cv-data.js back into an object, for reading a copy
  // that predates cv-data.json.
  function parseLegacy(text) {
    const sandbox = { window: {} };
    new Function("window", text)(sandbox.window);
    return sandbox.window.DEFAULT_CV || null;
  }

  /* ---------- data-loss guard -------------------------------------------- */

  const countLinks = (cv) =>
    (cv?.publications || []).reduce((n, p) => n + (p.links ? p.links.length : 0), 0);

  // A stored copy can be a stale fork of the real data — it once cost 103
  // publication links. Callers refuse writes that shed data unless the loss
  // has been confirmed.
  function assessLoss(baseCv, nextCv) {
    if (!baseCv) return null;
    const losses = [];
    const dp = baseCv.publications?.length || 0;
    const np = nextCv.publications?.length || 0;
    if (np < dp) losses.push(`${dp - np} publications`);
    const dl = countLinks(baseCv);
    const nl = countLinks(nextCv);
    if (nl < dl) losses.push(`${dl - nl} publication links`);
    const acr = (cv) => (cv.publications || []).filter((p) => p.venueAcronym).length;
    if (acr(nextCv) < acr(baseCv)) losses.push(`${acr(baseCv) - acr(nextCv)} venue acronyms`);
    return losses.length ? losses.join(", ") : null;
  }

  /* ---------- change detection ------------------------------------------- */

  // Hash of the canonical form, used to tell "nobody touched this" from
  // "someone edited it elsewhere" without keeping a second copy around.
  async function digest(cv) {
    const bytes = new TextEncoder().encode(serializeJson(cv));
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // The files a save writes, in repo-relative form.
  const files = (cv) => [
    { path: "cv-data.json", content: serializeJson(cv) },
    { path: "cv-data.js", content: serialize(cv) },
  ];

  window.cvSerialize = {
    serialize, serializeJson, parseLegacy, assessLoss, countLinks, digest, files,
  };
})();
