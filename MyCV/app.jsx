/* global React, ReactDOM, Display, cvAuth, cvFsSync, cvGhSync, cvSerialize, cvStats */
const { useState, useEffect, useRef, useCallback } = React;

/* ============================================================
   Password modal — shown when entering edit mode
   ============================================================ */
function PasswordModal({ isSetup, onSubmit, onCancel, error, pending }) {
  const [val, setVal]           = useState("");
  const [confirm, setConfirm]   = useState("");
  const [localErr, setLocalErr] = useState("");
  const inputRef                = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalErr("");
    if (isSetup) {
      if (val.length < 8) { setLocalErr("Password must be at least 8 characters."); return; }
      if (val !== confirm) { setLocalErr("Passwords do not match."); return; }
    }
    onSubmit(val);
  };

  const msg = localErr || error;

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="auth-modal">
        <div className="auth-modal-header">
          <span className="auth-icon">🔒</span>
          <h3>{isSetup ? "Set Edit Password" : "Enter Password"}</h3>
        </div>
        {isSetup && (
          <p className="auth-note">
            First-time setup. Choose a password to protect your edit mode.
            It is never stored — only an encrypted token is saved.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            className="auth-input"
            value={val}
            onChange={(e) => { setVal(e.target.value); setLocalErr(""); }}
            placeholder={isSetup ? "New password (min 8 chars)" : "Password"}
            autoComplete={isSetup ? "new-password" : "current-password"}
            disabled={pending}
          />
          {isSetup && (
            <input
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setLocalErr(""); }}
              placeholder="Confirm password"
              autoComplete="new-password"
              disabled={pending}
            />
          )}
          {msg && <p className="auth-error">{msg}</p>}
          <div className="auth-actions">
            <button type="button" className="tb-btn" onClick={onCancel} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="tb-btn primary" disabled={pending || !val}>
              {pending ? "Verifying…" : isSetup ? "Set Password" : "Unlock Edit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Cloud sync setup — repository and access token
   ============================================================ */
function CloudModal({ config, connected, onConnect, onDisconnect, onCancel, error, pending, canStore }) {
  const [owner, setOwner]   = useState(config.owner);
  const [repo, setRepo]     = useState(config.repo);
  const [branch, setBranch] = useState(config.branch);
  const [token, setToken]   = useState("");
  const inputRef            = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConnect({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim() }, token.trim());
  };

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="auth-modal">
        <div className="auth-modal-header">
          <span className="auth-icon">☁</span>
          <h3>{connected ? "Cloud Sync" : "Connect Cloud Sync"}</h3>
        </div>
        <p className="auth-note">
          Saves the CV as a commit to your website repository, so any browser can pick
          it up. Create a <b>fine-grained personal access token</b> at GitHub → Settings →
          Developer settings, scoped to this repository only, with{" "}
          <b>Contents: read and write</b>.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="cloud-row">
            <input className="auth-input" value={owner} onChange={(e) => setOwner(e.target.value)}
              placeholder="owner" autoComplete="off" disabled={pending} />
            <input className="auth-input" value={repo} onChange={(e) => setRepo(e.target.value)}
              placeholder="repository" autoComplete="off" disabled={pending} />
            <input className="auth-input" value={branch} onChange={(e) => setBranch(e.target.value)}
              placeholder="branch" autoComplete="off" disabled={pending} />
          </div>
          <input
            ref={inputRef}
            type="password"
            className="auth-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={connected ? "Replace token (github_pat_…)" : "Access token (github_pat_…)"}
            autoComplete="off"
            disabled={pending}
          />
          <p className="auth-note" style={{marginTop: 0}}>
            {canStore
              ? "The token is encrypted with your edit password before being stored on this device."
              : "No edit password is set, so the token will be kept for this session only."}
          </p>
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-actions">
            {connected && (
              <button type="button" className="tb-btn" onClick={onDisconnect} disabled={pending}
                title="Forget the stored token on this device">
                Disconnect
              </button>
            )}
            <button type="button" className="tb-btn" onClick={onCancel} disabled={pending}>Close</button>
            <button type="submit" className="tb-btn primary" disabled={pending || !token}>
              {pending ? "Checking…" : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Citation sources — profile IDs, the Scholar relay, the Elsevier key
   ============================================================ */
function StatsModal({ config, hasKey, canStore, onSave, onForgetKey, onCancel, error, pending }) {
  const [scholarId, setScholarId] = useState(config.scholarId);
  const [scopusId, setScopusId]   = useState(config.scopusId);
  const [relay, setRelay]         = useState(config.relay);
  const [apiKey, setApiKey]       = useState("");
  const inputRef                  = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(
      { scholarId: scholarId.trim(), scopusId: scopusId.trim(), relay: relay.trim() },
      apiKey.trim()
    );
  };

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="auth-modal">
        <div className="auth-modal-header">
          <span className="auth-icon">⟳</span>
          <h3>Citation Sources</h3>
        </div>
        <p className="auth-note">
          <b>Scopus</b> answers the browser directly — it needs a free API key from{" "}
          <a href="https://dev.elsevier.com/apikey/manage" target="_blank" rel="noopener">dev.elsevier.com</a>,
          registered to the site you are on.{" "}
          <b>Google Scholar</b> has no API and blocks proxies, so it goes through a relay you
          deploy yourself — <code>tools/scholar-worker.js</code>.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field-lab">Google Scholar profile ID</label>
          <input ref={inputRef} className="auth-input" value={scholarId} autoComplete="off"
            onChange={(e) => setScholarId(e.target.value)} placeholder="VArdauUAAAAJ" disabled={pending} />

          <label className="field-lab">Scholar relay URL</label>
          <input className="auth-input" value={relay} autoComplete="off"
            onChange={(e) => setRelay(e.target.value)} placeholder="https://cv-stats.you.workers.dev" disabled={pending} />

          <label className="field-lab">Scopus author ID</label>
          <input className="auth-input" value={scopusId} autoComplete="off"
            onChange={(e) => setScopusId(e.target.value)} placeholder="56422351700" disabled={pending} />

          <label className="field-lab">Elsevier API key {hasKey && <span style={{color: "var(--accent)"}}>· stored</span>}</label>
          <input type="password" className="auth-input" value={apiKey} autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? "Replace the stored key" : "API key"} disabled={pending} />

          <p className="auth-note" style={{marginTop: 0}}>
            {canStore
              ? "The key is encrypted with your edit password before being stored on this device."
              : "No edit password is set, so the key will be kept for this session only."}
          </p>
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-actions">
            {hasKey && (
              <button type="button" className="tb-btn" onClick={onForgetKey} disabled={pending}
                title="Forget the stored Elsevier key on this device">
                Forget key
              </button>
            )}
            <button type="button" className="tb-btn" onClick={onCancel} disabled={pending}>Close</button>
            <button type="submit" className="tb-btn primary" disabled={pending}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [cv, setCV]     = useState(() => loadCV());
  // Never restore edit mode from localStorage — always require password
  const [mode, setMode] = useState("display");
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");

  const [showAuth, setShowAuth]   = useState(false);
  const [authError, setAuthError] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [query, setQuery] = useState("");
  const fileRef = useRef(null);

  // Disk sync: when linked, every edit is written back to cv-data.js so
  // research.html sees it without an export/import round trip.
  const [dirHandle, setDirHandle] = useState(null);
  const [syncMsg, setSyncMsg] = useState("");
  const [pendingLoss, setPendingLoss] = useState("");
  const skipFirstWrite = useRef(true);

  // Cloud sync: commits to the website repo, so devices without a checkout —
  // or without the File System Access API — stay in step.
  const [ghToken, setGhToken]       = useState(null);
  const [ghMsg, setGhMsg]           = useState("");
  const [ghBusy, setGhBusy]         = useState(false);
  const [ghDirty, setGhDirty]       = useState(false);
  const [ghConflict, setGhConflict] = useState("");
  const [showCloud, setShowCloud]   = useState(false);
  const [cloudErr, setCloudErr]     = useState("");
  // Citation stats: two fetch buttons in the Publications section, one per
  // source. The Elsevier key is unlocked alongside the GitHub token.
  const [statsCfg, setStatsCfg]   = useState(() => window.cvStats?.config() || null);
  const [elsKey, setElsKey]       = useState(null);
  const [statsMsg, setStatsMsg]   = useState("");
  const [statsBusy, setStatsBusy] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsErr, setStatsErr]   = useState("");

  // The edit password's derived key, kept for the session so the stored
  // GitHub token and Elsevier key can be decrypted — and re-encrypted —
  // without re-prompting.
  const authKeyRef = useRef(null);

  const cloudReady = window.cvGhSync?.supported() && cvGhSync.configured();

  // persist
  useEffect(() => { saveCV(cv); }, [cv]);

  // On load, compare this device against the cloud copy. Adopting it silently
  // is only safe when nothing was edited here since the last sync; anything
  // else is surfaced and left to the user.
  useEffect(() => {
    if (!cloudReady) return;
    let cancelled = false;
    cvGhSync.status(cv, null)   // deliberately the mount-time cv, run once
      .then((s) => {
        if (cancelled || !s) return;
        if (s.state === "behind") {
          setCV(s.remote.cv);
          cvGhSync.setSyncedHash(s.remote.hash);
          setGhMsg("loaded a newer CV from GitHub");
        } else if (s.state === "ahead") {
          setGhMsg("this device has changes not yet pushed");
        } else if (s.state === "diverged") {
          setGhConflict("this device and GitHub have both changed since the last sync");
          setGhMsg("out of sync with GitHub");
        }
      })
      .catch((err) => setGhMsg(err.message));
    return () => { cancelled = true; };
  }, []);

  // Whether there is anything worth pushing.
  useEffect(() => {
    if (!cloudReady) return;
    let cancelled = false;
    cvSerialize.digest(cv)
      .then((h) => { if (!cancelled) setGhDirty(h !== cvGhSync.syncedHash()); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [cv]);

  const pushCloud = async ({ force = false } = {}) => {
    if (!ghToken) { setCloudErr(""); setShowCloud(true); return; }
    setGhBusy(true);
    setGhMsg("pushing…");
    try {
      const r = await cvGhSync.push(cv, ghToken, { force });
      setGhConflict("");
      setGhDirty(false);
      setGhMsg(r.upToDate ? "already up to date" : `pushed ${r.commit} · public pages update in ~1 min`);
    } catch (err) {
      if (err.conflict) setGhConflict(err.message);
      setGhMsg(err.message);
    } finally {
      setGhBusy(false);
    }
  };

  const pullCloud = async () => {
    setGhBusy(true);
    try {
      const remote = await cvGhSync.pull(ghToken);
      if (!remote) { setGhMsg("nothing stored in the cloud yet — push first"); return; }
      setCV(remote.cv);
      cvGhSync.setSyncedHash(remote.hash);
      setGhConflict("");
      setGhDirty(false);
      setGhMsg("loaded the cloud version");
    } catch (err) {
      setGhMsg(err.message);
    } finally {
      setGhBusy(false);
    }
  };

  const connectCloud = async (cfg, token) => {
    setCloudErr("");
    setGhBusy(true);
    try {
      const full = await cvGhSync.connect(token, cfg);
      cvGhSync.setConfig(full);
      if (authKeyRef.current) await cvGhSync.saveToken(token, authKeyRef.current);
      setGhToken(token);
      setShowCloud(false);
      setGhMsg(`connected to ${full.owner}/${full.repo}`);
    } catch (err) {
      setCloudErr(err.message);
    } finally {
      setGhBusy(false);
    }
  };

  const disconnectCloud = () => {
    cvGhSync.clearToken();
    setGhToken(null);
    setShowCloud(false);
    setGhMsg("disconnected — the token was removed from this device");
  };

  /* ---------- citation stats ---------- */

  // Both sources land in pubStats as {source, count, h}: the same shape the
  // fields already hold, so a fetch is only ever a faster way to type them.
  const applyStats = (slot, r) => {
    setCV(prev => stampDate(setIn(prev, ["pubStats", slot], {
      ...prev.pubStats[slot], source: r.source, count: r.count, h: r.h,
    })));
  };

  const fetchStats = async (which) => {
    const scholar = which === "scholar";
    // Nothing to fetch with yet — send them to the settings rather than fail.
    if (scholar ? !statsCfg?.relay : !elsKey) { setStatsErr(""); setShowStats(true); return; }
    setStatsBusy(true);
    setStatsMsg(scholar ? "reading Google Scholar…" : "reading Scopus…");
    try {
      const r = scholar
        ? await cvStats.fetchScholar(statsCfg)
        : await cvStats.fetchScopus(elsKey, statsCfg);
      applyStats(scholar ? "citations" : "citations2", r);
      setStatsMsg(`${r.count} citations · h-index ${r.h} · ${r.source}`);
    } catch (err) {
      setStatsMsg(err.message);
    } finally {
      setStatsBusy(false);
    }
  };

  const saveStats = async (cfg, apiKey) => {
    setStatsErr("");
    setStatsBusy(true);
    try {
      cvStats.setConfig(cfg);
      setStatsCfg(cfg);
      if (apiKey) {
        if (authKeyRef.current) await cvStats.saveKey(apiKey, authKeyRef.current);
        setElsKey(apiKey);
      }
      setShowStats(false);
      setStatsMsg("citation sources saved");
    } catch (err) {
      setStatsErr(err.message);
    } finally {
      setStatsBusy(false);
    }
  };

  const forgetStatsKey = () => {
    cvStats.clearKey();
    setElsKey(null);
    setShowStats(false);
    setStatsMsg("the Elsevier key was removed from this device");
  };

  // Re-link silently on load if the folder permission is still granted.
  useEffect(() => {
    if (!window.cvFsSync?.supported()) return;
    cvFsSync.restore().then((d) => { if (d) setDirHandle(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!dirHandle) return;
    // The first run after linking would rewrite the file with what it already
    // contains; skip it so linking alone never dirties the working tree.
    if (skipFirstWrite.current) { skipFirstWrite.current = false; return; }
    const t = setTimeout(async () => {
      try {
        const written = await cvFsSync.write(dirHandle, cv);
        const at = new Date().toLocaleTimeString();
        setSyncMsg(`saved ${written.length} files · ${at}`);
        setPendingLoss("");
      } catch (err) {
        // A shrinking save is usually a stale copy, but it can also be a
        // deliberate deletion — surface it and let the user decide.
        if (err.message.startsWith("refusing to save")) setPendingLoss(err.message);
        setSyncMsg(err.message);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [cv, dirHandle]);

  const saveAnyway = async () => {
    try {
      const written = await cvFsSync.write(dirHandle, cv, { force: true });
      setSyncMsg(`saved ${written.length} files · ${new Date().toLocaleTimeString()}`);
      setPendingLoss("");
    } catch (err) {
      setSyncMsg(`save failed — ${err.message}`);
    }
  };

  const toggleLink = async () => {
    if (dirHandle) {
      await cvFsSync.forget();
      setDirHandle(null);
      setSyncMsg("");
      return;
    }
    try {
      const d = await cvFsSync.pickDir();
      // What's in localStorage may be an older fork than the file on disk, so
      // check before letting it become the thing that gets written.
      const disk = await cvFsSync.readCurrent(d).catch(() => null);
      const loss = cvFsSync.assessLoss(disk, cv);
      if (loss) {
        const takeDisk = confirm(
          `The CV in this browser is missing ${loss} compared to cv-data.js on disk.\n\n` +
          `OK — load the file's version (recommended, discards the browser copy)\n` +
          `Cancel — don't link, so nothing is overwritten`
        );
        if (!takeDisk) { setSyncMsg("not linked — browser copy is out of date"); return; }
        setCV(disk);
      }
      skipFirstWrite.current = true;
      setDirHandle(d);
      setSyncMsg("linked — edits now save to cv-data.js");
    } catch (err) {
      if (err.name !== "AbortError") setSyncMsg(err.message);
    }
  };
  useEffect(() => {
    document.body.dataset.mode = mode;
    document.documentElement.dataset.theme = theme;
    // Do not persist mode — edit always requires password re-entry
    localStorage.setItem(THEME_KEY, theme);
  }, [mode, theme]);

  const handleEditClick = () => {
    if (mode === "edit") { setMode("display"); return; }
    setAuthError("");
    setShowAuth(true);
  };

  // The stored credentials are encrypted with the edit password, so they only
  // become usable once that password has been entered.
  const unlockSecrets = async (key) => {
    if (window.cvGhSync?.supported() && cvGhSync.hasToken()) {
      const t = await cvGhSync.loadToken(key);
      if (t) setGhToken(t);
      else setGhMsg("the stored GitHub token could not be read — reconnect cloud sync");
    }
    if (window.cvStats?.hasKey()) {
      const k = await cvStats.loadKey(key);
      if (k) setElsKey(k);
      else setStatsMsg("the stored Elsevier key could not be read — add it again under ⚙");
    }
  };

  const handleAuthSubmit = async (password) => {
    setAuthPending(true);
    setAuthError("");
    try {
      if (!cvAuth.isSetup()) {
        authKeyRef.current = await cvAuth.setup(password);
        setShowAuth(false);
        setMode("edit");
      } else {
        const key = await cvAuth.verify(password);
        if (key) {
          authKeyRef.current = key;
          await unlockSecrets(key);
          setShowAuth(false);
          setMode("edit");
        } else {
          setAuthError("Incorrect password.");
        }
      }
    } catch {
      setAuthError("Authentication error. Please try again.");
    } finally {
      setAuthPending(false);
    }
  };

  // mutations — every change stamps today's date as last update
  const stampDate = (data) => {
    const d = new Date();
    const today = `${d.getDate()} ${["January","February","March","April","May","June","July","August","September","October","November","December"][d.getMonth()]} ${d.getFullYear()}`;
    if (data?.meta && data.meta.lastUpdate !== today) {
      return { ...data, meta: { ...data.meta, lastUpdate: today } };
    }
    return data;
  };

  const onChange = useCallback((path, value) => {
    setCV(prev => stampDate(setIn(prev, path, value)));
  }, []);

  const onList = useCallback((path, op, payload) => {
    setCV(prev => {
      const parts = path.split(".");
      let cur = prev; for (const p of parts) cur = cur[p];
      let next = Array.isArray(cur) ? [...cur] : cur;
      if (op === "set") next[payload.i] = payload.v;
      else if (op === "field") next[payload.i] = { ...next[payload.i], [payload.k]: payload.v };
      else if (op === "remove") next.splice(payload.i, 1);
      else if (op === "add") next = [...next, payload];
      else if (op === "addAt") { next = [...next]; next.splice(payload.i, 0, payload.item); }
      else if (op === "replace") next = payload;
      else if (op === "move") {
        const { i, dir } = payload;
        const j = i + dir;
        if (j >= 0 && j < next.length) { [next[i], next[j]] = [next[j], next[i]]; }
      }
      return stampDate(setIn(prev, path, next));
    });
  }, []);

  // import / export
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cv-${cv.meta.name.replace(/\s+/g, "_")}.json`;
    a.click(); URL.revokeObjectURL(url);
  };
  const importJSON = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { setCV(JSON.parse(r.result)); }
      catch (err) { alert("Invalid JSON file."); }
    };
    r.readAsText(f);
    e.target.value = "";
  };
  const resetData = () => {
    if (confirm("Reset to the default CV? Your edits will be lost.")) {
      setCV(JSON.parse(JSON.stringify(window.DEFAULT_CV)));
    }
  };

  return (
    <>
      {showAuth && (
        <PasswordModal
          isSetup={!cvAuth.isSetup()}
          onSubmit={handleAuthSubmit}
          onCancel={() => { setShowAuth(false); setAuthError(""); }}
          error={authError}
          pending={authPending}
        />
      )}

      {showCloud && (
        <CloudModal
          config={cvGhSync.config()}
          connected={!!ghToken}
          canStore={!!authKeyRef.current}
          onConnect={connectCloud}
          onDisconnect={disconnectCloud}
          onCancel={() => { setShowCloud(false); setCloudErr(""); }}
          error={cloudErr}
          pending={ghBusy}
        />
      )}

      {showStats && (
        <StatsModal
          config={statsCfg || cvStats.defaults()}
          hasKey={!!elsKey || !!window.cvStats?.hasKey()}
          canStore={!!authKeyRef.current}
          onSave={saveStats}
          onForgetKey={forgetStatsKey}
          onCancel={() => { setShowStats(false); setStatsErr(""); }}
          error={statsErr}
          pending={statsBusy}
        />
      )}

      <nav className="toolbar">
        <div className="brand"><b>MyCV</b> — <i>{cv.meta.name.split(" ")[0]}'s curriculum vitae</i></div>

        <div className="tb-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button className="tb-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Toggle theme">
          {theme === "light" ? "◐ Dark" : "◑ Light"}
        </button>
        <button className="tb-btn" onClick={() => window.print()} title="Print or save PDF">⎙ Print</button>
        {mode === "edit" && <>
          {window.cvFsSync?.supported() && (
            <button
              className={`tb-btn ${dirHandle ? "is-on" : ""}`}
              onClick={toggleLink}
              title={dirHandle ? "Edits are saving to cv-data.js — click to unlink" : "Save edits straight to cv-data.js"}
            >
              {dirHandle ? "⛓ Linked" : "⛓ Link file"}
            </button>
          )}
          {syncMsg && <span className="tb-note">{syncMsg}</span>}
          {pendingLoss && (
            <button className="tb-btn" onClick={saveAnyway} title="Write anyway, accepting the loss">
              ⚠ Save anyway
            </button>
          )}
          {window.cvGhSync?.supported() && (
            <button
              className={`tb-btn ${ghDirty ? "" : "is-on"}`}
              onClick={() => pushCloud()}
              disabled={ghBusy}
              title={ghToken ? "Commit the CV to GitHub" : "Set up GitHub sync"}
            >
              {ghBusy ? "☁ …" : !ghToken ? "☁ Set up sync" : ghDirty ? "☁ Push •" : "☁ Push"}
            </button>
          )}
          {ghToken && (
            <button className="tb-btn" onClick={() => { setCloudErr(""); setShowCloud(true); }}
              title="Cloud sync settings">⚙</button>
          )}
          {ghMsg && <span className="tb-note">{ghMsg}</span>}
          {ghConflict && <>
            <button className="tb-btn" onClick={pullCloud} disabled={ghBusy}
              title="Discard this device's version and take the cloud copy">
              ↓ Load cloud
            </button>
            <button className="tb-btn" onClick={() => pushCloud({ force: true })} disabled={ghBusy}
              title="Overwrite the cloud copy with this device's version">
              ⚠ Push anyway
            </button>
          </>}
          <button className="tb-btn" onClick={exportJSON} title="Download JSON">↓ Export</button>
          <button className="tb-btn" onClick={() => fileRef.current?.click()} title="Upload JSON">↑ Import</button>
        </>}
        <input ref={fileRef} type="file" accept="application/json" style={{display:"none"}} onChange={importJSON} />

        <div className="sep"></div>

        <button
          className={`tb-btn primary ${mode === "edit" ? "is-on" : ""}`}
          onClick={handleEditClick}
        >
          {mode === "edit" ? "✓ Done editing" : "✎ Edit"}
        </button>
      </nav>

      {mode === "edit" && (
        <div style={{maxWidth: 920, margin: "0 auto", padding: "0 56px"}}>
          <div className="edit-banner">
            <span className="lab">Edit mode</span>
            <span style={{color: "var(--ink-soft)"}}>Click any text to edit. Hover rows to reorder or remove. Changes save automatically to this device.</span>
            <span style={{marginLeft: "auto", display: "flex", gap: 8}}>
              <button className="tb-btn" onClick={resetData} style={{fontSize: 11}}>↺ Reset to default</button>
              <button className="tb-btn" title="Remove stored password token (you will set a new one next time)"
                onClick={() => {
                  // The GitHub token is encrypted with the old password, so it
                  // becomes unreadable — drop it rather than leave a dead blob.
                  const stranded = [
                    window.cvGhSync?.hasToken() && "the GitHub token",
                    window.cvStats?.hasKey() && "the Elsevier API key",
                  ].filter(Boolean);
                  const alsoToken = stranded.length
                    ? ` ${stranded.join(" and ")} will be removed too, and will need entering again.`
                    : "";
                  if (confirm("Remove the stored password token? You will be prompted to set a new password next time you enter edit mode." + alsoToken)) {
                    cvAuth.reset();
                    if (window.cvGhSync?.hasToken()) { cvGhSync.clearToken(); setGhToken(null); }
                    if (window.cvStats?.hasKey()) { cvStats.clearKey(); setElsKey(null); }
                    authKeyRef.current = null;
                    setMode("display");
                  }
                }}
                style={{fontSize: 11}}>
                🔑 Change password
              </button>
            </span>
          </div>
        </div>
      )}

      <Display
        cv={cv} onChange={onChange} onList={onList} mode={mode} query={query}
        stats={window.cvStats?.supported() ? {
          busy: statsBusy,
          msg: statsMsg,
          scholar: () => fetchStats("scholar"),
          scopus: () => fetchStats("scopus"),
          settings: () => { setStatsErr(""); setShowStats(true); },
        } : null}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
