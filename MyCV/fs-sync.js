/**
 * Writes CV edits straight back to the repo on disk, using the File System
 * Access API. This is the local counterpart to gh-sync.js: same files, no
 * network, but it needs a checkout and only works in Chromium.
 *
 * You grant access to the repository folder once; the handle is kept in
 * IndexedDB so the link survives a reload. Callers should fall back to the
 * Export button, or to cloud sync, when `supported()` is false.
 */
(function () {
  const DB_NAME = "mycv-fs";
  const STORE = "handles";
  const HANDLE_KEY = "repo-dir";

  const supported = () =>
    typeof window.showDirectoryPicker === "function" &&
    typeof indexedDB !== "undefined";

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

  // Guard against picking MyCV/ instead of the repo root.
  async function validate(dir) {
    await dir.getFileHandle("cv-data.js");
    await dir.getDirectoryHandle("MyCV");
  }

  async function pickDir() {
    const dir = await window.showDirectoryPicker({ mode: "readwrite", id: "mycv-repo" });
    try {
      await validate(dir);
    } catch (e) {
      throw new Error(
        "That folder doesn't look like the website repo — expected cv-data.js and a MyCV folder inside it."
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

  // Reads what the checkout currently holds, so a link can compare disk
  // against memory instead of assuming memory is newer. Falls back to the
  // generated cv-data.js for a checkout predating cv-data.json.
  async function readCurrent(dir) {
    try {
      const fh = await dir.getFileHandle("cv-data.json");
      return JSON.parse(await (await fh.getFile()).text());
    } catch (e) {
      const fh = await dir.getFileHandle("cv-data.js");
      return cvSerialize.parseLegacy(await (await fh.getFile()).text());
    }
  }

  async function write(dir, cv, { force = false } = {}) {
    if (!force) {
      const disk = await readCurrent(dir).catch(() => null);
      const loss = cvSerialize.assessLoss(disk, cv);
      if (loss) throw new Error(`refusing to save — would drop ${loss}`);
    }
    for (const { path, content } of cvSerialize.files(cv)) {
      const fh = await dir.getFileHandle(path, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
    }
    return cvSerialize.files(cv).map((f) => f.path);
  }

  window.cvFsSync = {
    supported, pickDir, restore, reauthorize, forget, write, readCurrent,
    // kept for callers that used these before cv-serialize.js existed
    serialize: (cv) => cvSerialize.serialize(cv),
    assessLoss: (a, b) => cvSerialize.assessLoss(a, b),
  };
})();
