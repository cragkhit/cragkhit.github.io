/**
 * Writes CV edits straight back to cv-data.js on disk, using the File System
 * Access API. Without this, edits live only in localStorage and have to be
 * exported by hand before research.html can see them.
 *
 * You grant access to the repository folder once; the handle is kept in
 * IndexedDB so the link survives a reload. Chromium-only — callers should
 * fall back to the Export button when `supported()` is false.
 */
(function () {
  const DB_NAME = "mycv-fs";
  const STORE = "handles";
  const HANDLE_KEY = "repo-dir";

  // Files to keep in sync, relative to the picked directory.
  const TARGETS = [["cv-data.js"], ["MyCV", "cv-data.js"]];

  const supported = () =>
    typeof window.showDirectoryPicker === "function" &&
    typeof indexedDB !== "undefined";

  /* ---------- serialization: mirror the hand-written cv-data.js style ------ */

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

  // Note the header: once disk sync is linked this file is rewritten wholesale,
  // so any comment added inside it by hand would be lost on the next edit.
  function serialize(cv) {
    return (
      "// Default CV data. Lives in localStorage once the user edits it.\n" +
      "// Rewritten by MyCV's disk sync (MyCV/fs-sync.js) — edits made here by\n" +
      "// hand, including comments, are overwritten on the next CV edit.\n" +
      "// pubStats holds only citation figures; the journal/conference/workshop/\n" +
      "// chapter counts are derived from `publications` at render time.\n" +
      `window.DEFAULT_CV = ${ser(cv, 0, 0)};\n`
    );
  }

  /* ---------- handle persistence ----------------------------------------- */

  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(k, v) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(v, k);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(k) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(k);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDel(k) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(k);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  /* ---------- directory handling ----------------------------------------- */

  // Guard against picking MyCV/ instead of the repo root: both targets have to
  // resolve, otherwise a half-written sync would silently skip a file.
  async function validate(dir) {
    for (const parts of TARGETS) {
      let node = dir;
      for (const seg of parts.slice(0, -1)) {
        node = await node.getDirectoryHandle(seg); // throws if absent
      }
      await node.getFileHandle(parts[parts.length - 1]);
    }
  }

  async function pickDir() {
    const dir = await window.showDirectoryPicker({ mode: "readwrite", id: "mycv-repo" });
    try {
      await validate(dir);
    } catch (e) {
      throw new Error(
        "That folder doesn't look like the website repo — expected cv-data.js and MyCV/cv-data.js inside it."
      );
    }
    await idbSet(HANDLE_KEY, dir);
    return dir;
  }

  // Silent restore: only reports a handle whose permission is still granted,
  // since requesting it again needs a user gesture.
  async function restore() {
    const dir = await idbGet(HANDLE_KEY).catch(() => null);
    if (!dir) return null;
    const perm = await dir.queryPermission({ mode: "readwrite" });
    return perm === "granted" ? dir : null;
  }

  async function reauthorize(dir) {
    const perm = await dir.requestPermission({ mode: "readwrite" });
    return perm === "granted";
  }

  async function forget() {
    await idbDel(HANDLE_KEY).catch(() => {});
  }

  // Reads whatever cv-data.js currently holds, so a link can compare disk
  // against memory instead of assuming memory is newer.
  async function readCurrent(dir) {
    const fh = await dir.getFileHandle("cv-data.js");
    const text = await (await fh.getFile()).text();
    const sandbox = { window: {} };
    new Function("window", text)(sandbox.window);
    return sandbox.window.DEFAULT_CV || null;
  }

  const countLinks = (cv) =>
    (cv?.publications || []).reduce((n, p) => n + (p.links ? p.links.length : 0), 0);

  // localStorage can hold a stale fork seeded from an older cv-data.js — it
  // once cost 103 publication links. Refuse writes that shed data unless the
  // caller has explicitly confirmed the loss.
  function assessLoss(diskCv, nextCv) {
    if (!diskCv) return null;
    const losses = [];
    const dp = diskCv.publications?.length || 0;
    const np = nextCv.publications?.length || 0;
    if (np < dp) losses.push(`${dp - np} publications`);
    const dl = countLinks(diskCv);
    const nl = countLinks(nextCv);
    if (nl < dl) losses.push(`${dl - nl} publication links`);
    const acr = (cv) => (cv.publications || []).filter((p) => p.venueAcronym).length;
    if (acr(nextCv) < acr(diskCv)) losses.push(`${acr(diskCv) - acr(nextCv)} venue acronyms`);
    return losses.length ? losses.join(", ") : null;
  }

  async function write(dir, cv, { force = false } = {}) {
    if (!force) {
      const disk = await readCurrent(dir).catch(() => null);
      const loss = assessLoss(disk, cv);
      if (loss) throw new Error(`refusing to save — would drop ${loss}`);
    }
    const text = serialize(cv);
    for (const parts of TARGETS) {
      let node = dir;
      for (const seg of parts.slice(0, -1)) {
        node = await node.getDirectoryHandle(seg);
      }
      const fh = await node.getFileHandle(parts[parts.length - 1], { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
    }
    return TARGETS.map((p) => p.join("/"));
  }

  window.cvFsSync = {
    supported, serialize, pickDir, restore, reauthorize, forget, write,
    readCurrent, assessLoss,
  };
})();
