/* global React, ReactDOM, Display, cvAuth */
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

  // persist
  useEffect(() => { saveCV(cv); }, [cv]);
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

  const handleAuthSubmit = async (password) => {
    setAuthPending(true);
    setAuthError("");
    try {
      if (!cvAuth.isSetup()) {
        await cvAuth.setup(password);
        setShowAuth(false);
        setMode("edit");
      } else {
        const key = await cvAuth.verify(password);
        if (key) {
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
                onClick={() => { if (confirm("Remove the stored password token? You will be prompted to set a new password next time you enter edit mode.")) { cvAuth.reset(); setMode("display"); } }}
                style={{fontSize: 11}}>
                🔑 Change password
              </button>
            </span>
          </div>
        </div>
      )}

      <Display cv={cv} onChange={onChange} onList={onList} mode={mode} query={query} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
