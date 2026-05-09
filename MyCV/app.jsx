/* global React, ReactDOM, Display */
const { useState, useEffect, useRef, useCallback } = React;

function App() {
  const [cv, setCV] = useState(() => loadCV());
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || "display");
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [query, setQuery] = useState("");
  const fileRef = useRef(null);

  // persist
  useEffect(() => { saveCV(cv); }, [cv]);
  useEffect(() => {
    document.body.dataset.mode = mode;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(MODE_KEY, mode);
    localStorage.setItem(THEME_KEY, theme);
  }, [mode, theme]);

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
          onClick={() => setMode(mode === "edit" ? "display" : "edit")}
        >
          {mode === "edit" ? "✓ Done editing" : "✎ Edit"}
        </button>
      </nav>

      {mode === "edit" && (
        <div style={{maxWidth: 920, margin: "0 auto", padding: "0 56px"}}>
          <div className="edit-banner">
            <span className="lab">Edit mode</span>
            <span style={{color: "var(--ink-soft)"}}>Click any text to edit. Hover rows to reorder or remove. Changes save automatically to this device.</span>
            <span style={{marginLeft: "auto"}}>
              <button className="tb-btn" onClick={resetData} style={{fontSize: 11}}>↺ Reset to default</button>
            </span>
          </div>
        </div>
      )}

      <Display cv={cv} onChange={onChange} onList={onList} mode={mode} query={query} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
