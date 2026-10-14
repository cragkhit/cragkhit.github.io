/**
 * Turns the CV object into the two files that live in the repo. Used by
 * tools/firebase-sync.mjs, which loads this file against a stand-in window.
 *
 *   cv-data.json  canonical — the file you edit
 *   cv-data.js    generated — a `window.DEFAULT_CV = …` assignment, kept so
 *                 the pages can render with a plain script tag before the
 *                 live Firestore copy arrives (cv-live.js)
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

  // Note the header: this file is regenerated on every change to
  // cv-data.json, so a comment added inside it by hand would be lost.
  function serialize(cv) {
    return (
      "// Generated from cv-data.json — do not edit by hand.\n" +
      "// Rewritten in full by tools/firebase-sync.mjs on every change;\n" +
      "// edits made here, including comments, are overwritten.\n" +
      "// pubStats holds only citation figures; the journal/conference/workshop/\n" +
      "// chapter counts are derived from `publications` at render time.\n" +
      `window.DEFAULT_CV = ${ser(cv, 0, 0)};\n`
    );
  }

  const serializeJson = (cv) => JSON.stringify(cv, null, 2) + "\n";

  window.cvSerialize = { serialize, serializeJson };
})();
