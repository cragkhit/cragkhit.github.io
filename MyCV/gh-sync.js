/**
 * Cloud sync: commits CV edits to the website repo through the GitHub API,
 * so the CV can be edited from any browser — phone, iPad, a machine without
 * a checkout — instead of only from Chromium with fs-sync.js linked.
 *
 * The repo stays the single source of truth: every save is an ordinary commit
 * touching cv-data.json and the generated cv-data.js, and GitHub Pages then
 * republishes the public pages. Nothing here runs for visitors.
 *
 * A fine-grained personal access token (this repo only, Contents: read+write)
 * authorises the push. It is stored encrypted with the edit-mode password —
 * see cv-auth.js — so a copy of localStorage alone does not yield the token.
 */
(function () {
  const CFG_KEY = "mycv:gh:config";
  const TOKEN_KEY = "mycv:gh:token";
  const HASH_KEY = "mycv:gh:synced-hash";
  const API = "https://api.github.com";

  const supported = () =>
    typeof fetch === "function" && typeof crypto?.subtle?.encrypt === "function";

  /* ---------- base64 that survives non-ASCII ------------------------------ */

  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64decode(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /* ---------- config ------------------------------------------------------ */

  // Defaults come from the host when the site is served from *.github.io,
  // so a first run on the published site needs only a token.
  function defaults() {
    const host = location.hostname || "";
    if (/\.github\.io$/.test(host)) {
      return { owner: host.replace(/\.github\.io$/, ""), repo: host, branch: "master" };
    }
    return { owner: "", repo: "", branch: "master" };
  }

  function config() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (raw) return { ...defaults(), ...JSON.parse(raw) };
    } catch (e) {}
    return defaults();
  }

  function setConfig(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  const configured = () => {
    const c = config();
    return !!(c.owner && c.repo);
  };

  /* ---------- token at rest ----------------------------------------------- */

  const enc64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const dec64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const hasToken = () => !!localStorage.getItem(TOKEN_KEY);

  async function saveToken(token, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(token)
    );
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ iv: enc64(iv), ct: enc64(ct) }));
  }

  // Returns null when the token is absent, or when the key no longer matches —
  // which is what a password reset looks like from here.
  async function loadToken(key) {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw || !key) return null;
    try {
      const { iv, ct } = JSON.parse(raw);
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: dec64(iv) },
        key,
        dec64(ct)
      );
      return new TextDecoder().decode(plain);
    } catch (e) {
      return null;
    }
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /* ---------- sync bookkeeping -------------------------------------------- */

  // Hash of the data as of the last successful pull or push. Comparing it
  // against both sides tells an unedited device from a diverged one.
  const syncedHash = () => localStorage.getItem(HASH_KEY) || null;
  const setSyncedHash = (h) => localStorage.setItem(HASH_KEY, h);

  /* ---------- HTTP -------------------------------------------------------- */

  async function api(path, { token, method = "GET", body } = {}) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (res.status === 404) {
      const err = new Error("not found");
      err.status = 404;
      throw err;
    }
    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.json()).message || "";
      } catch (e) {}
      const err = new Error(explain(res.status, detail));
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  function explain(status, detail) {
    if (status === 401) return "GitHub rejected the token — it may have expired. Reconnect with a new one.";
    if (status === 403 && /rate limit/i.test(detail))
      return "GitHub rate limit reached — try again in a few minutes.";
    if (status === 403)
      return "Token lacks permission — it needs Contents: read and write on this repository.";
    if (status === 409 || status === 422)
      return "The branch moved while saving — pull the cloud version, then save again.";
    return detail ? `GitHub error ${status}: ${detail}` : `GitHub error ${status}`;
  }

  /* ---------- connect ----------------------------------------------------- */

  // Validates the token against the repo before anything is stored, and picks
  // up the real default branch so a repo on `main` needs no manual setup.
  async function connect(token, cfg) {
    const { owner, repo } = cfg;
    if (!owner || !repo) throw new Error("Enter the owner and repository name.");
    const info = await api(`/repos/${owner}/${repo}`, { token }).catch((e) => {
      if (e.status === 404)
        throw new Error(`Can't see ${owner}/${repo} — check the name, and that the token grants this repository.`);
      throw e;
    });
    if (info.permissions && !info.permissions.push) {
      throw new Error("That token is read-only — it needs Contents: read and write.");
    }
    return { ...cfg, branch: cfg.branch || info.default_branch || "master" };
  }

  /* ---------- pull -------------------------------------------------------- */

  // Reads cv-data.json from the branch tip. Works without a token on a public
  // repo, which is what lets a fresh device load the CV before unlocking edit.
  async function pull(token) {
    const { owner, repo, branch } = config();
    if (!owner || !repo) throw new Error("Cloud sync is not set up yet.");
    let cv;
    try {
      const file = await api(
        `/repos/${owner}/${repo}/contents/cv-data.json?ref=${encodeURIComponent(branch)}`,
        { token }
      );
      cv = JSON.parse(b64decode(file.content));
    } catch (e) {
      if (e.status === 404) return null; // repo predates cv-data.json
      // An unauthenticated read can hit the shared IP rate limit; the raw
      // host has no such limit, at the cost of a short CDN delay.
      if (!token && e.status === 403) {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/cv-data.json?t=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw e;
        cv = await res.json();
      } else {
        throw e;
      }
    }
    return { cv, hash: await cvSerialize.digest(cv) };
  }

  /* ---------- push -------------------------------------------------------- */

  // One commit for both files, via the git data API: blobs, then a tree on top
  // of the current one, then a commit, then a fast-forward of the branch.
  async function commitFiles(token, files, message) {
    const { owner, repo, branch } = config();
    const base = `/repos/${owner}/${repo}/git`;

    const ref = await api(`${base}/ref/heads/${encodeURIComponent(branch)}`, { token });
    const headSha = ref.object.sha;
    const headCommit = await api(`${base}/commits/${headSha}`, { token });

    const blobs = [];
    for (const f of files) {
      const blob = await api(`${base}/blobs`, {
        token,
        method: "POST",
        body: { content: b64encode(f.content), encoding: "base64" },
      });
      blobs.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
    }

    const tree = await api(`${base}/trees`, {
      token,
      method: "POST",
      body: { base_tree: headCommit.tree.sha, tree: blobs },
    });

    const commit = await api(`${base}/commits`, {
      token,
      method: "POST",
      body: { message, tree: tree.sha, parents: [headSha] },
    });

    // No force: a branch that moved under us fails here rather than
    // discarding whatever landed in between.
    await api(`${base}/refs/heads/${encodeURIComponent(branch)}`, {
      token,
      method: "PATCH",
      body: { sha: commit.sha, force: false },
    });

    return commit;
  }

  function message(cv) {
    const pubs = cv.publications?.length || 0;
    return `Update CV data via MyCV\n\n${pubs} publications · last update ${cv.meta?.lastUpdate || "unknown"}`;
  }

  /**
   * Pushes the CV. Refuses, rather than overwriting, when the cloud copy has
   * moved on since this device last synced, or when the write would shed
   * data — both are reported as `err.conflict` so the UI can offer a choice.
   */
  async function push(cv, token, { force = false } = {}) {
    if (!token) throw new Error("Connect to GitHub first.");
    const remote = await pull(token);
    const hash = await cvSerialize.digest(cv);

    if (remote && remote.hash === hash) {
      setSyncedHash(hash);
      return { upToDate: true };
    }

    if (remote && !force) {
      const loss = cvSerialize.assessLoss(remote.cv, cv);
      if (loss) {
        const err = new Error(`refusing to push — would drop ${loss} from the cloud copy`);
        err.conflict = true;
        throw err;
      }
      if (syncedHash() && remote.hash !== syncedHash()) {
        const err = new Error(
          "the cloud copy changed since this device last synced — pushing would overwrite those edits"
        );
        err.conflict = true;
        throw err;
      }
    }

    const commit = await commitFiles(token, cvSerialize.files(cv), message(cv));
    setSyncedHash(hash);
    return {
      commit: commit.sha.slice(0, 7),
      url: `https://github.com/${config().owner}/${config().repo}/commit/${commit.sha}`,
      files: cvSerialize.files(cv).map((f) => f.path),
    };
  }

  /**
   * Classifies what a device is looking at on load, so the UI can adopt the
   * cloud copy silently when nothing local would be lost.
   *   in-sync   both sides match
   *   behind    only the cloud moved — safe to adopt
   *   ahead     only this device has edits — a push is due
   *   diverged  both moved — the user has to choose
   */
  async function status(cv, token) {
    const remote = await pull(token);
    if (!remote) return { state: "absent", remote: null };
    const local = await cvSerialize.digest(cv);
    if (local === remote.hash) {
      setSyncedHash(local);
      return { state: "in-sync", remote };
    }
    const base = syncedHash();
    if (!base) return { state: "diverged", remote };
    if (local === base) return { state: "behind", remote };
    if (remote.hash === base) return { state: "ahead", remote };
    return { state: "diverged", remote };
  }

  window.cvGhSync = {
    supported, config, setConfig, configured, defaults,
    hasToken, saveToken, loadToken, clearToken,
    syncedHash, setSyncedHash,
    connect, pull, push, status,
  };
})();
