/* global React, ReactDOM, Display */
const { useState, useEffect } = React;

/* ============================================================
   MyCV is a read-only view of cv-data.json. It renders the static
   cv-data.js first and follows the live Firestore copy through
   cv-live.js, so a pushed change appears without a reload. Edit
   cv-data.json and push — see tools/firebase-sync.mjs.
   ============================================================ */
const noop = () => {};

function App() {
  const [cv, setCV]       = useState(() => window.DEFAULT_CV);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onUpdate = (e) => setCV(e.detail);
    window.addEventListener("cv:update", onUpdate);
    return () => window.removeEventListener("cv:update", onUpdate);
  }, []);

  useEffect(() => {
    document.body.dataset.mode = "display";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }, [theme]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cv-${cv.meta.name.replace(/\s+/g, "_")}.json`;
    a.click(); URL.revokeObjectURL(url);
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
        <button className="tb-btn" onClick={exportJSON} title="Download JSON">↓ Export</button>
      </nav>

      <Display cv={cv} onChange={noop} onList={noop} mode="display" query={query} stats={null} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
