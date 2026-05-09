/* global React */
const { useState, useMemo } = React;

/* ============================================================
   Display — renders all sections from `cv`
   onChange(path, value)  → update field
   onListChange(path, op, payload) → list mutations: add/remove/move/setItem
   mode: "display" | "edit"
   query: search filter string (display-only effect)
   ============================================================ */
function Display({ cv, onChange, onList, mode, query }) {
  const editing = mode === "edit";
  const Q = (query || "").toLowerCase().trim();
  const matches = (s) => !Q || (s || "").toLowerCase().includes(Q);

  // helper: build up/down handlers for a list at `path`
  const move = (path, i, len) => ({
    onMoveUp: i > 0 ? () => onList(path, "move", { i, dir: -1 }) : undefined,
    onMoveDown: i < len - 1 ? () => onList(path, "move", { i, dir: 1 }) : undefined,
  });

  return (
    <EditContext.Provider value={editing}>
    <main className="page">
      <Hero cv={cv} onChange={onChange} editing={editing} />

      <Section num="01" title="Research Interests" id="interests">
        <div className="chips">
          {cv.interests.map((it, i) => (
            <span key={i} className="chip has-actions">
              <Editable value={it} onChange={(v) => onList("interests", "set", { i, v })} />
              {editing && <RowActions onRemove={() => onList("interests", "remove", { i })} {...move("interests", i, cv.interests.length)} />}
            </span>
          ))}
        </div>
        {editing && <AddRowButton onClick={() => onList("interests", "add", "New interest")} label="interest" />}
      </Section>

      <Section num="02" title="Professional Experience" id="experience">
        {cv.experience.map((row, i) => (
          <div className="tl-row has-actions" key={i}>
            <div className="tl-when">
              <MonthYearPicker editing={editing} value={row.start} onChange={(v) => onList("experience", "field", { i, k: "start", v })} />
              <span> – </span>
              <MonthYearPicker editing={editing} value={row.end} onChange={(v) => onList("experience", "field", { i, k: "end", v })} allowPresent />
              {/^present$/i.test(row.end) && <span className="now">NOW</span>}
            </div>
            <div className="tl-what">
              <Editable className="role" value={row.role} onChange={(v) => onList("experience", "field", { i, k: "role", v })} />
              <Editable className="org" value={`${row.org}${row.location ? " · " + row.location : ""}`} onChange={(v) => {
                const [org, ...loc] = v.split(" · ");
                onList("experience", "field", { i, k: "org", v: org });
                onList("experience", "field", { i, k: "location", v: loc.join(" · ") });
              }} />
            </div>
            {editing && <RowActions onRemove={() => onList("experience", "remove", { i })} {...move("experience", i, cv.experience.length)} />}
          </div>
        ))}
        {editing && <AddRowButton onClick={() => onList("experience", "add", { role: "Role", org: "Organization", location: "", start: "Year", end: "Present" })} label="role" />}
      </Section>

      <Section num="03" title="Education" id="education">
        {cv.education.map((row, i) => (
          <div className="edu-item has-actions" key={i}>
            <Editable className="edu-degree" value={row.degree} onChange={(v) => onList("education", "field", { i, k: "degree", v })} />
            <Editable className="edu-school" value={row.school} onChange={(v) => onList("education", "field", { i, k: "school", v })} />
            <div className="edu-meta">
              <Editable value={row.department} onChange={(v) => onList("education", "field", { i, k: "department", v })} />
              {" — "}
              <Editable value={row.location} onChange={(v) => onList("education", "field", { i, k: "location", v })} />
              {" · "}
              <Editable value={row.year} onChange={(v) => onList("education", "field", { i, k: "year", v })} />
            </div>
            {editing && <RowActions onRemove={() => onList("education", "remove", { i })} {...move("education", i, cv.education.length)} />}
          </div>
        ))}
        {editing && <AddRowButton onClick={() => onList("education", "add", { degree: "Degree", school: "School", department: "", location: "", year: "Year" })} label="degree" />}
      </Section>

      <Section num="04" title="Selected Honors" id="honors">
        <ul className="bullet-list">
          {cv.honors.filter(matches).map((h, i) => (
            <li key={i} className="has-actions">
              <Editable value={h} onChange={(v) => onList("honors", "set", { i, v })} multiline />
              {editing && <RowActions onRemove={() => onList("honors", "remove", { i })} {...move("honors", i, cv.honors.length)} />}
            </li>
          ))}
        </ul>
        {editing && <AddRowButton onClick={() => onList("honors", "add", "New honor or award")} label="honor" />}
      </Section>

      <Section num="05" title="Funded Research Grants" id="grants">
        <ul className="bullet-list">
          {cv.grants.filter(matches).map((g, i) => (
            <li key={i} className="has-actions">
              <Editable value={g} onChange={(v) => onList("grants", "set", { i, v })} multiline />
              {editing && <RowActions onRemove={() => onList("grants", "remove", { i })} {...move("grants", i, cv.grants.length)} />}
            </li>
          ))}
        </ul>
        {editing && <AddRowButton onClick={() => onList("grants", "add", "New grant")} label="grant" />}
      </Section>

      <PublicationsSection cv={cv} onList={onList} editing={editing} matches={matches} move={move} />

      <SupervisionSection cv={cv} onList={onList} editing={editing} move={move} />

      <Section num="08" title="Teaching at Mahidol University" id="teaching">
        <table className="tt-table">
          <thead><tr><th>Code</th><th>Course</th><th>Years</th>{editing && <th></th>}</tr></thead>
          <tbody>
            {cv.teaching.map((row, i) => (
              <tr key={i} className="has-actions">
                <td><Editable className="tt-code" value={row.code} onChange={(v) => onList("teaching", "field", { i, k: "code", v })} /></td>
                <td><Editable className="tt-title" value={row.title} onChange={(v) => onList("teaching", "field", { i, k: "title", v })} /></td>
                <td><Editable className="tt-years" value={row.years} onChange={(v) => onList("teaching", "field", { i, k: "years", v })} /></td>
                {editing && <td><button className="ec-btn danger" onClick={() => onList("teaching", "remove", { i })}>×</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {editing && <AddRowButton onClick={() => onList("teaching", "add", { code: "ITCSxxx", title: "Course title", years: "Year" })} label="course" />}
      </Section>

      <ServicesSection cv={cv} onList={onList} onChange={onChange} editing={editing} />

      <Section num="10" title="Selected Invited Talks" id="talks">
        {cv.talks.map((t, i) => (
          <div className="talk-row has-actions" key={i}>
            <Editable className="talk-title" value={t.title} onChange={(v) => onList("talks", "field", { i, k: "title", v })} />
            <div className="talk-meta">
              <Editable value={t.host} onChange={(v) => onList("talks", "field", { i, k: "host", v })} />
              {", "}
              <Editable value={t.location} onChange={(v) => onList("talks", "field", { i, k: "location", v })} />
              <span className="when">
                <Editable value={t.date} onChange={(v) => onList("talks", "field", { i, k: "date", v })} />
              </span>
            </div>
            {editing && <RowActions onRemove={() => onList("talks", "remove", { i })} {...move("talks", i, cv.talks.length)} />}
          </div>
        ))}
        {editing && <AddRowButton onClick={() => onList("talks", "add", { title: "Talk title", host: "Host", location: "Location", date: "Date" })} label="talk" />}
      </Section>

      <footer className="foot">
        <span>Last updated · <Editable value={cv.meta.lastUpdate} onChange={(v) => onChange("meta.lastUpdate", v)} /></span>
        <span>{cv.meta.name}</span>
      </footer>
    </main>
    </EditContext.Provider>
  );
}

function Hero({ cv, onChange, editing }) {
  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange("meta.photo", r.result);
    r.readAsDataURL(f);
  };
  return (
    <header className="hero">
      <div className="stamp">
        <span className="dot"></span>
        <span>Curriculum Vitae</span>
        <span>·</span>
        <span><Editable value={cv.meta.lastUpdate} onChange={(v) => onChange("meta.lastUpdate", v)} /></span>
      </div>
      <div className="hero-grid">
        <div>
          <h1>
            <Editable value={cv.meta.name} onChange={(v) => onChange("meta.name", v)} />
          </h1>
          <Editable className="role" value={cv.meta.title} onChange={(v) => onChange("meta.title", v)} />
          <div className="tagline">
            {(Array.isArray(cv.meta.tagline) ? cv.meta.tagline : []).map((t, i) => (
              <span key={i} className="tagline-item has-actions">
                <Editable value={t} onChange={(v) => {
                  const next = [...cv.meta.tagline]; next[i] = v;
                  onChange("meta.tagline", next);
                }} />
                {editing && <button className="ec-btn danger" style={{marginLeft: 4, width: 16, height: 16, fontSize: 10, verticalAlign: "middle"}} onClick={() => {
                  const next = cv.meta.tagline.filter((_, j) => j !== i);
                  onChange("meta.tagline", next);
                }}>×</button>}
                {i < cv.meta.tagline.length - 1 && <span className="tagline-sep"> · </span>}
              </span>
            ))}
            {editing && <button className="ec-add" style={{marginLeft: 8, verticalAlign: "middle"}} onClick={() => onChange("meta.tagline", [...(cv.meta.tagline || []), "New focus area"])}>+ focus</button>}
          </div>
        </div>
        <label className="hero-photo" title={editing ? "Click to upload a photo" : ""}>
          {(cv.meta.photo || window.DEFAULT_CV.meta.photo)
            ? <img src={cv.meta.photo || window.DEFAULT_CV.meta.photo} alt="" />
            : <span>PHOTO<br/>132×168</span>}
          {editing && <input type="file" accept="image/*" onChange={onPhoto} />}
        </label>
      </div>

      <div className="contact-strip">
        <div className="cs-cell">
          <div className="lab">Address</div>
          <div className="val">
            {cv.contact.address.map((line, i) => (
              <span key={i} className="has-actions" style={{position: "relative", display: "block"}}>
                <Editable value={line} onChange={(v) => onList_inHero("contact.address", i, v, onChange, cv)} />
                {editing && <HeroMoves path="contact.address" i={i} len={cv.contact.address.length} onChange={onChange} cv={cv} />}
                {editing && <button className="ec-btn danger" style={{marginLeft: 6, width: 16, height: 16, fontSize: 10}} onClick={() => { const n = cv.contact.address.filter((_, j) => j !== i); onChange("contact.address", n); }}>×</button>}
              </span>
            ))}
            {editing && <button className="ec-add" style={{marginTop: 8}} onClick={() => onChange("contact.address", [...cv.contact.address, "New address line"])}>+ line</button>}
          </div>
        </div>
        <div className="cs-cell">
          <div className="lab">Phone</div>
          <div className="val">
            <Editable value={cv.contact.tel} onChange={(v) => onChange("contact.tel", v)} />
            <Editable value={cv.contact.mobile} onChange={(v) => onChange("contact.mobile", v)} />
          </div>
        </div>
        <div className="cs-cell">
          <div className="lab">Email · Web</div>
          <div className="val">
            {cv.contact.emails.map((e, i) => (
              <span key={i} style={{display: "block"}}>
                <Editable value={e} onChange={(v) => onList_inHero("contact.emails", i, v, onChange, cv)} />
                {editing && <HeroMoves path="contact.emails" i={i} len={cv.contact.emails.length} onChange={onChange} cv={cv} />}
                {editing && <button className="ec-btn danger" style={{marginLeft: 6, width: 16, height: 16, fontSize: 10}} onClick={() => { const n = cv.contact.emails.filter((_, j) => j !== i); onChange("contact.emails", n); }}>×</button>}
              </span>
            ))}
            {cv.contact.links.map((l, i) => (
              <span key={i} style={{display: "block"}}>
                <a href={l.url} target="_blank" rel="noopener">
                  <Editable value={l.label} onChange={(v) => {
                    const next = [...cv.contact.links];
                    next[i] = { ...next[i], label: v };
                    onChange("contact.links", next);
                  }} />
                </a>
                {editing && <>
                  <span style={{color: "var(--ink-mute)", fontSize: 11}}> · </span>
                  <Editable value={l.url} onChange={(v) => { const next = [...cv.contact.links]; next[i] = { ...next[i], url: v }; onChange("contact.links", next); }} />
                  <HeroMoves path="contact.links" i={i} len={cv.contact.links.length} onChange={onChange} cv={cv} />
                  <button className="ec-btn danger" style={{marginLeft: 6, width: 16, height: 16, fontSize: 10}} onClick={() => { const n = cv.contact.links.filter((_, j) => j !== i); onChange("contact.links", n); }}>×</button>
                </>}
              </span>
            ))}
            {editing && <div style={{marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap"}}>
              <button className="ec-add" onClick={() => onChange("contact.emails", [...cv.contact.emails, "new@example.com"])}>+ email</button>
              <button className="ec-add" onClick={() => onChange("contact.links", [...cv.contact.links, { label: "New link", url: "https://" }])}>+ link</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}
function heroSwap(path, i, dir, onChange, cv) {
  const parts = path.split(".");
  let cur = cv; for (const p of parts) cur = cur[p];
  const j = i + dir; if (j < 0 || j >= cur.length) return;
  const next = [...cur]; [next[i], next[j]] = [next[j], next[i]];
  onChange(path, next);
}
function HeroMoves({ path, i, len, onChange, cv }) {
  const btn = { width: 16, height: 16, fontSize: 10, marginLeft: 4 };
  return <>
    {i > 0 && <button className="ec-btn" style={btn} onClick={() => heroSwap(path, i, -1, onChange, cv)} title="Move up">↑</button>}
    {i < len - 1 && <button className="ec-btn" style={btn} onClick={() => heroSwap(path, i, 1, onChange, cv)} title="Move down">↓</button>}
  </>;
}
function onList_inHero(path, i, v, onChange, cv) {
  const parts = path.split(".");
  let cur = cv; for (const p of parts) cur = cur[p];
  const next = [...cur]; next[i] = v;
  onChange(path, next);}

/* ---------- Section wrapper ---------- */
function Section({ num, title, id, children, meta }) {
  return (
    <section className="section" id={id} data-screen-label={`${num} ${title}`}>
      <header className="section-head">
        <span className="num">§ {num}</span>
        <h2>{title}</h2>
        {meta ? <span className="meta">{meta}</span> : <span></span>}
      </header>
      {children}
    </section>
  );
}

/* ---------- Publications ---------- */
function PublicationsSection({ cv, onList, editing, matches, move }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const types = [
    { key: "all", label: "All" },
    { key: "journal", label: "Journals" },
    { key: "conference", label: "Conferences" },
    { key: "workshop", label: "Workshops" },
    { key: "chapter", label: "Book Chapters" }
  ];
  const years = useMemo(() => {
    const ys = [...new Set(cv.publications.map(p => p.year))].sort((a, b) => b - a);
    return ["all", ...ys];
  }, [cv.publications]);

  const filtered = cv.publications.filter(p => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (yearFilter !== "all" && String(p.year) !== String(yearFilter)) return false;
    if (!matches(p.title) && !matches(p.authors) && !matches(p.venue)) return false;
    return true;
  });

  const groups = [
    { key: "chapter", label: "Book Chapters" },
    { key: "journal", label: "Journal Articles" },
    { key: "conference", label: "Conference Papers" },
    { key: "workshop", label: "Workshop Papers" }
  ];

  return (
    <Section num="06" title="Publications" id="publications" meta={`${cv.publications.length} total`}>
      <div className="pub-stats">
        <div className="pub-stat"><div className="n">{cv.pubStats.journals}</div><div className="l">Journals</div></div>
        <div className="pub-stat"><div className="n">{cv.pubStats.conferences}</div><div className="l">Conferences</div></div>
        <div className="pub-stat"><div className="n">{cv.pubStats.workshops}</div><div className="l">Workshops</div></div>
        <div className="pub-stat"><div className="n">{cv.pubStats.chapters}</div><div className="l">Chapters</div></div>
        <div className="pub-stat"><div className="n">{cv.pubStats.citations.count}</div><div className="l">{cv.pubStats.citations.source}</div></div>
        <div className="pub-stat"><div className="n">h{cv.pubStats.citations.h}</div><div className="l">h-index · Scholar</div></div>
      </div>
      <div className="cite-row">
        <span><b>{cv.pubStats.citations.count}</b> citations · h-index <b>{cv.pubStats.citations.h}</b> ({cv.pubStats.citations.source})</span>
        <span><b>{cv.pubStats.citations2.count}</b> citations · h-index <b>{cv.pubStats.citations2.h}</b> ({cv.pubStats.citations2.source})</span>
      </div>
      <div className="pub-filters">
        {types.map(t => (
          <button key={t.key} className={`pf-btn ${typeFilter === t.key ? "is-on" : ""}`} onClick={() => setTypeFilter(t.key)}>{t.label}</button>
        ))}
        <span style={{width: 12}}></span>
        {years.map(y => (
          <button key={y} className={`pf-btn ${String(yearFilter) === String(y) ? "is-on" : ""}`} onClick={() => setYearFilter(y)}>{y === "all" ? "All years" : y}</button>
        ))}
      </div>

      {groups.map(g => {
        const items = filtered.filter(p => p.type === g.key);
        if (typeFilter !== "all" && typeFilter !== g.key) return null;
        if (items.length === 0) return null;
        return (
          <div className="pub-group" key={g.key}>
            <div className="pub-group-title">{g.label} · {items.length}</div>
            {items.map((p) => {
              const i = cv.publications.indexOf(p);
              return (
                <div className="pub-item has-actions" key={i}>
                  <div className="pub-year"><Editable value={String(p.year)} onChange={(v) => onList("publications", "field", { i, k: "year", v: parseInt(v) || v })} /></div>
                  <div className="pub-body">
                    <Editable className="pub-title" value={p.title} onChange={(v) => onList("publications", "field", { i, k: "title", v })} multiline />
                    <Editable className="pub-authors" value={p.authors} onChange={(v) => onList("publications", "field", { i, k: "authors", v })} multiline />
                    <Editable className="pub-venue" value={p.venue} onChange={(v) => onList("publications", "field", { i, k: "venue", v })} multiline />
                  </div>
                  {editing && <RowActions onRemove={() => onList("publications", "remove", { i })} {...move("publications", i, cv.publications.length)} />}
                </div>
              );
            })}
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{color: "var(--ink-mute)", fontStyle: "italic", padding: "16px 0"}}>No publications match this filter.</div>}
      {editing && <AddRowButton onClick={() => onList("publications", "add", { type: typeFilter === "all" ? "journal" : typeFilter, year: new Date().getFullYear(), authors: "Authors", title: "Title", venue: "Venue" })} label="publication" />}
    </Section>
  );
}

/* ---------- Supervision ---------- */
function SupervisionSection({ cv, onList, editing, move }) {
  const blocks = [
    { key: "phd", label: "Doctoral Students" },
    { key: "masters", label: "Master's Students" },
    { key: "undergrad", label: "Undergraduate Projects" }
  ];
  return (
    <Section num="07" title="Student Supervision" id="supervision">
      {blocks.map(b => (
        <div className="sup-block" key={b.key}>
          <h4>{b.label}</h4>
          {(cv.supervision[b.key] || []).map((yr, yi) => (
            <div className="sup-year has-actions" key={yi}>
              <div className="yr">{yr.years}</div>
              <ul>
                {yr.entries.map((e, ei) => (
                  <li key={ei} className="has-actions" style={{position: "relative"}}>
                    <Editable value={e} onChange={(v) => {
                      const next = JSON.parse(JSON.stringify(cv.supervision));
                      next[b.key][yi].entries[ei] = v;
                      onList("supervision", "replace", next);
                    }} multiline />
                    {editing && <button className="ec-btn danger" style={{marginLeft: 8}} onClick={() => {
                      const next = JSON.parse(JSON.stringify(cv.supervision));
                      next[b.key][yi].entries.splice(ei, 1);
                      onList("supervision", "replace", next);
                    }}>×</button>}
                  </li>
                ))}
                {editing && <li><button className="ec-btn" onClick={() => {
                  const next = JSON.parse(JSON.stringify(cv.supervision));
                  next[b.key][yi].entries.push("New student");
                  onList("supervision", "replace", next);
                }}>+</button></li>}
              </ul>
            </div>
          ))}
          {editing && <AddRowButton onClick={() => {
            const next = JSON.parse(JSON.stringify(cv.supervision));
            (next[b.key] || (next[b.key] = [])).unshift({ years: String(new Date().getFullYear()), entries: ["New student"] });
            onList("supervision", "replace", next);
          }} label={`${b.label} year group`} />}
        </div>
      ))}
    </Section>
  );
}

/* ---------- Services ---------- */
function ServicesSection({ cv, onList, onChange, editing }) {
  const s = cv.services;
  const setS = (next) => onChange("services", next);
  const sMove = (key, i, dir) => {
    const n = [...s[key]];
    const j = i + dir;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    setS({ ...s, [key]: n });
  };
  const sm = (key, i) => ({
    onMoveUp: i > 0 ? () => sMove(key, i, -1) : undefined,
    onMoveDown: i < s[key].length - 1 ? () => sMove(key, i, 1) : undefined,
  });
  return (
    <Section num="09" title="Professional Services" id="services">
      <div className="svc-block">
        <h4>Consulting</h4>
        <ul className="bullet-list">
          {s.consulting.map((c, i) => (
            <li key={i} className="has-actions">
              <Editable value={c} onChange={(v) => { const n = [...s.consulting]; n[i] = v; setS({ ...s, consulting: n }); }} multiline />
              {editing && <RowActions onRemove={() => { const n = s.consulting.filter((_, j) => j !== i); setS({ ...s, consulting: n }); }} {...sm("consulting", i)} />}
            </li>
          ))}
        </ul>
        {editing && <AddRowButton onClick={() => setS({ ...s, consulting: [...s.consulting, "New consulting engagement"] })} label="consulting record" />}
      </div>

      <div className="svc-block">
        <h4>Online Courses</h4>
        <ul className="bullet-list">
          {s.courses.map((c, i) => (
            <li key={i} className="has-actions">
              <Editable value={c.title} onChange={(v) => { const n = [...s.courses]; n[i] = { ...n[i], title: v }; setS({ ...s, courses: n }); }} />
              {" · "}
              <a href={c.url} target="_blank" rel="noopener" style={{fontSize: 12.5, color: "var(--ink-mute)"}}>
                <Editable value={c.host} onChange={(v) => { const n = [...s.courses]; n[i] = { ...n[i], host: v }; setS({ ...s, courses: n }); }} />
              </a>
              {editing && <RowActions onRemove={() => { const n = s.courses.filter((_, j) => j !== i); setS({ ...s, courses: n }); }} {...sm("courses", i)} />}
            </li>
          ))}
        </ul>
        {editing && <AddRowButton onClick={() => setS({ ...s, courses: [...s.courses, { title: "New course", host: "Host", url: "https://" }] })} label="course" />}
      </div>

      <div className="svc-block">
        <h4>Journal Reviewer</h4>
        <div className="svc-tags">
          {s.journals.map((j, i) => (
            <span key={i} className="svc-tag has-actions">
              <Editable value={j} onChange={(v) => { const n = [...s.journals]; n[i] = v; setS({ ...s, journals: n }); }} />
              {editing && <button className="ec-btn danger" style={{marginLeft: 4, width: 16, height: 16, fontSize: 10}} onClick={() => { const n = s.journals.filter((_, k) => k !== i); setS({ ...s, journals: n }); }}>×</button>}
            </span>
          ))}
          {editing && <button className="ec-btn" onClick={() => setS({ ...s, journals: [...s.journals, "New Journal"] })}>+ journal</button>}
        </div>
      </div>

      <div className="svc-block">
        <h4>Organizing Committees</h4>
        {s.organizing.map((row, i) => (
          <div className="svc-year-row has-actions" key={i}>
            <div className="yr"><Editable value={String(row.year)} onChange={(v) => { const n = [...s.organizing]; n[i] = { ...n[i], year: v }; setS({ ...s, organizing: n }); }} /></div>
            <div style={{fontSize: 14, color: "var(--ink-soft)"}}>
              {row.items.map((it, j) => (
                <div key={j} style={{position: "relative"}}>— <Editable value={it} onChange={(v) => { const n = [...s.organizing]; n[i] = { ...n[i], items: n[i].items.map((x, k) => k === j ? v : x) }; setS({ ...s, organizing: n }); }} multiline />
                  {editing && <button className="ec-btn danger" style={{marginLeft: 6, width: 16, height: 16, fontSize: 10}} onClick={() => { const n = [...s.organizing]; n[i] = { ...n[i], items: n[i].items.filter((_, k) => k !== j) }; setS({ ...s, organizing: n }); }}>×</button>}
                </div>
              ))}
              {editing && <button className="ec-btn" style={{marginTop: 4}} onClick={() => { const n = [...s.organizing]; n[i] = { ...n[i], items: [...n[i].items, "New role"] }; setS({ ...s, organizing: n }); }}>+ item</button>}
            </div>
            {editing && <RowActions onRemove={() => { const n = s.organizing.filter((_, k) => k !== i); setS({ ...s, organizing: n }); }} {...sm("organizing", i)} />}
          </div>
        ))}
        {editing && <AddRowButton onClick={() => setS({ ...s, organizing: [{ year: new Date().getFullYear(), items: ["New role"] }, ...s.organizing] })} label="year group" />}
      </div>

      <div className="svc-block">
        <h4>Program Committee Membership</h4>
        {s.pcMembership.map((row, i) => (
          <div className="svc-year-row has-actions" key={i}>
            <div className="yr"><Editable value={String(row.year)} onChange={(v) => { const n = [...s.pcMembership]; n[i] = { ...n[i], year: v }; setS({ ...s, pcMembership: n }); }} /></div>
            <div className="svc-tags">
              {row.items.map((it, j) => (
                <span key={j} className="svc-tag"><Editable value={it} onChange={(v) => { const n = [...s.pcMembership]; n[i] = { ...n[i], items: n[i].items.map((x, k) => k === j ? v : x) }; setS({ ...s, pcMembership: n }); }} />
                  {editing && <button className="ec-btn danger" style={{marginLeft: 4, width: 14, height: 14, fontSize: 9}} onClick={() => { const n = [...s.pcMembership]; n[i] = { ...n[i], items: n[i].items.filter((_, k) => k !== j) }; setS({ ...s, pcMembership: n }); }}>×</button>}
                </span>
              ))}
              {editing && <button className="ec-btn" onClick={() => { const n = [...s.pcMembership]; n[i] = { ...n[i], items: [...n[i].items, "New venue"] }; setS({ ...s, pcMembership: n }); }}>+</button>}
            </div>
            {editing && <RowActions onRemove={() => { const n = s.pcMembership.filter((_, k) => k !== i); setS({ ...s, pcMembership: n }); }} {...sm("pcMembership", i)} />}
          </div>
        ))}
        {editing && <AddRowButton onClick={() => setS({ ...s, pcMembership: [{ year: new Date().getFullYear(), items: ["New venue"] }, ...s.pcMembership] })} label="year group" />}
      </div>

      <div className="svc-block">
        <h4>PhD Thesis Examiner</h4>
        <ul className="bullet-list">
          {s.examiner.map((e, i) => (
            <li key={i} className="has-actions">
              <Editable value={e} onChange={(v) => { const n = [...s.examiner]; n[i] = v; setS({ ...s, examiner: n }); }} multiline />
              {editing && <RowActions onRemove={() => { const n = s.examiner.filter((_, j) => j !== i); setS({ ...s, examiner: n }); }} {...sm("examiner", i)} />}
            </li>
          ))}
        </ul>
        {editing && <AddRowButton onClick={() => setS({ ...s, examiner: [...s.examiner, "New examiner record"] })} label="examiner record" />}
      </div>

      <div className="svc-block">
        <h4>Mentoring</h4>
        <ul className="bullet-list">
          {s.mentoring.map((e, i) => (
            <li key={i} className="has-actions">
              <Editable value={e} onChange={(v) => { const n = [...s.mentoring]; n[i] = v; setS({ ...s, mentoring: n }); }} multiline />
              {editing && <RowActions onRemove={() => { const n = s.mentoring.filter((_, j) => j !== i); setS({ ...s, mentoring: n }); }} {...sm("mentoring", i)} />}
            </li>
          ))}
        </ul>
        {editing && <AddRowButton onClick={() => setS({ ...s, mentoring: [...s.mentoring, "New mentoring record"] })} label="mentoring record" />}
      </div>
    </Section>
  );
}

Object.assign(window, { Display });
