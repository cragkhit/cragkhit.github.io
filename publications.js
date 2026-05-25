/**
 * Renders the publications list on research.html from window.DEFAULT_CV.publications
 * with type/year filters and a search input (mirrors the MyCV app).
 */
(function () {
  const TYPE_LABEL = {
    journal: "Journal",
    conference: "Conference",
    workshop: "Workshop",
    chapter: "Book Chapter",
  };

  const TYPE_GROUPS = [
    { key: "chapter",    label: "Book Chapters" },
    { key: "journal",    label: "Journal Articles" },
    { key: "conference", label: "Conference Papers" },
    { key: "workshop",   label: "Workshop Papers" },
  ];

  const TYPE_FILTERS = [
    { key: "all",        label: "All" },
    { key: "journal",    label: "Journals" },
    { key: "conference", label: "Conferences" },
    { key: "workshop",   label: "Workshops" },
    { key: "chapter",    label: "Book Chapters" },
  ];


  // --- State -------------------------------------------------------------
  const state = {
    typeFilter: "all",
    yearFilter: "all",
    venueFilter: "all",
    query: "",
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlightAcronym(venue, acronym, fullName) {
    if (!acronym) return escapeHtml(venue);
    const re = new RegExp("\\b" + acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    const m = re.exec(venue);
    if (!m) {
      return escapeHtml(venue) + ` (<span class="acronym">${escapeHtml(acronym)}</span>)`;
    }
    const alreadyExpanded = fullName && venue.includes(fullName);
    const acHtml = `<span class="acronym">${escapeHtml(m[0])}</span>`;
    const replacement = (fullName && !alreadyExpanded)
      ? `<span class="venue-full">${escapeHtml(fullName)}</span> (${acHtml})`
      : acHtml;
    return (
      escapeHtml(venue.slice(0, m.index)) +
      replacement +
      escapeHtml(venue.slice(m.index + m[0].length))
    );
  }

  function highlightQuery(text, q) {
    if (!q) return escapeHtml(text);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("(" + escaped + ")", "ig");
    return escapeHtml(text).replace(
      new RegExp("(" + escaped.replace(/[&<>"']/g, "") + ")", "ig"),
      (m) => `<mark>${m}</mark>`
    );
    // Note: simple inline highlight; intentional fallback to escaped if regex breaks.
  }

  function renderPublication(p, q) {
    const venueHtml = highlightAcronym(p.venue || "", p.venueAcronym || null, p.venueFullName || null);
    const links = Array.isArray(p.links) ? p.links : [];
    const linksHtml = links.length
      ? `<div class="publication-links">${links
          .map(
            (l) =>
              `<a class="btn btn-small" href="${escapeHtml(l.url)}"${
                /^https?:/i.test(l.url) ? ' target="_blank" rel="noopener"' : ""
              }>${escapeHtml(l.label)}</a>`
          )
          .join("")}</div>`
      : "";
    const yearStr = escapeHtml(String(p.year || ""));
    return `<div class="publication-item" data-type="${p.type}">
      <h4><span class="pub-year-inline">${yearStr}</span> ${highlightQuery(p.title || "", q)}</h4>
      <p class="authors">${highlightQuery(p.authors || "", q)}</p>
      <p class="venue">${venueHtml}</p>
      ${linksHtml}
    </div>`;
  }

  function renderGroup(label, items, q) {
    if (!items.length) return "";
    return `<div class="pub-group">
      <div class="pub-group-title">${escapeHtml(label)} <span class="pub-group-count">· ${items.length}</span></div>
      <div class="publication-list">
        ${items.map((p) => renderPublication(p, q)).join("\n")}
      </div>
    </div>`;
  }

  function applyFilters(pubs) {
    const q = state.query.toLowerCase().trim();
    return pubs.filter((p) => {
      if (state.typeFilter !== "all" && p.type !== state.typeFilter) return false;
      if (state.yearFilter !== "all" && String(p.year) !== String(state.yearFilter)) return false;
      if (state.venueFilter !== "all" && p.venueAcronym !== state.venueFilter) return false;
      if (q) {
        const hay = ((p.title || "") + " " + (p.authors || "") + " " + (p.venue || "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderResults() {
    const container = document.getElementById("publicationsContainer");
    const countEl = document.getElementById("pubCount");
    if (!container) return;

    const all = window.DEFAULT_CV?.publications || [];
    const filtered = applyFilters(all);
    const q = state.query.toLowerCase().trim();

    // Group by type. If a single type is selected, just render that one group.
    let html = "";
    const groups = state.typeFilter === "all" ? TYPE_GROUPS : TYPE_GROUPS.filter((g) => g.key === state.typeFilter);
    for (const g of groups) {
      const items = filtered.filter((p) => p.type === g.key);
      html += renderGroup(g.label, items, q);
    }

    if (!filtered.length) {
      html = `<p class="pub-empty">No publications match this filter.</p>`;
    }

    container.innerHTML = html;
    if (countEl) {
      countEl.textContent = `${filtered.length} of ${all.length}`;
    }

    if (typeof window.updateVenueSummary === "function") {
      window.updateVenueSummary();
    }
  }

  // --- Filter UI ---------------------------------------------------------
  function buildTypeFilters() {
    const wrap = document.getElementById("pubTypeFilters");
    if (!wrap) return;
    wrap.innerHTML = TYPE_FILTERS
      .map((t) => `<button type="button" class="pf-btn" data-key="${t.key}">${t.label}</button>`)
      .join("");
    syncActive(wrap, state.typeFilter);
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".pf-btn");
      if (!btn) return;
      state.typeFilter = btn.dataset.key;
      syncActive(wrap, state.typeFilter);
      renderResults();
    });
  }

  function buildYearFilters() {
    const wrap = document.getElementById("pubYearFilters");
    if (!wrap) return;
    const years = [...new Set((window.DEFAULT_CV?.publications || []).map((p) => p.year))].sort((a, b) => b - a);
    const opts = ["all", ...years];
    wrap.innerHTML = opts
      .map(
        (y) =>
          `<button type="button" class="pf-btn" data-key="${y}">${y === "all" ? "All years" : y}</button>`
      )
      .join("");
    syncActive(wrap, state.yearFilter);
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".pf-btn");
      if (!btn) return;
      state.yearFilter = btn.dataset.key;
      syncActive(wrap, state.yearFilter);
      renderResults();
    });
  }

  function buildVenueFilters() {
    const wrap = document.getElementById("pubVenueFilters");
    if (!wrap) return;
    const all = window.DEFAULT_CV?.publications || [];

    const counts = {};
    const fullNames = {};
    for (const p of all) {
      if (!p.venueAcronym) continue;
      counts[p.venueAcronym] = (counts[p.venueAcronym] || 0) + 1;
      if (p.venueFullName && !fullNames[p.venueAcronym]) {
        fullNames[p.venueAcronym] = p.venueFullName;
      }
    }

    const venues = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    wrap.innerHTML = [
      `<button type="button" class="pf-btn" data-key="all">All venues</button>`,
      ...venues.map(([ac, n]) => {
        const title = fullNames[ac] ? ` title="${escapeHtml(fullNames[ac])}"` : "";
        return `<button type="button" class="pf-btn" data-key="${escapeHtml(ac)}"${title}>${escapeHtml(ac)} · ${n}</button>`;
      }),
    ].join("");

    syncActive(wrap, state.venueFilter);
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".pf-btn");
      if (!btn) return;
      state.venueFilter = btn.dataset.key;
      syncActive(wrap, state.venueFilter);
      renderResults();
    });
  }

  function buildSearch() {
    const input = document.getElementById("pubSearch");
    if (!input) return;
    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.query = input.value;
        renderResults();
      }, 120);
    });
  }

  function syncActive(wrap, key) {
    wrap.querySelectorAll(".pf-btn").forEach((b) => {
      b.classList.toggle("is-on", String(b.dataset.key) === String(key));
    });
  }

  function init() {
    buildTypeFilters();
    buildYearFilters();
    buildVenueFilters();
    buildSearch();
    renderResults();
    renderServices();

    // Hide legacy load-more button — replaced by filters.
    const btn = document.getElementById("loadMoreBtn");
    if (btn) btn.hidden = true;
  }

  // ---------- Academic services -----------------------------------------
  function renderServices() {
    const wrap = document.getElementById("servicesList");
    if (!wrap) return;
    const s = window.DEFAULT_CV?.services;
    if (!s) {
      wrap.innerHTML = `<p class="pub-empty">Service data is unavailable.</p>`;
      return;
    }

    const block = (label, content) => `
      <div class="svc-block">
        <div class="svc-label">${escapeHtml(label)}</div>
        <div class="svc-content">${content}</div>
      </div>`;

    const bullets = (arr) =>
      `<ul class="svc-bullets">${arr
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join("")}</ul>`;

    const courses = (arr) =>
      `<ul class="svc-courses">${arr
        .map(
          (c) =>
            `<li><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(
              c.title
            )}</a> <span class="svc-host">· ${escapeHtml(c.host)}</span></li>`
        )
        .join("")}</ul>`;

    const tags = (arr) =>
      `<div class="svc-tags">${arr
        .map((t) => `<span class="svc-tag">${escapeHtml(t)}</span>`)
        .join("")}</div>`;

    const yearRows = (rows) =>
      `<div class="svc-years">${rows
        .map(
          (r) =>
            `<div class="svc-year-row"><div class="svc-year">${escapeHtml(
              String(r.year)
            )}</div><ul class="svc-items">${r.items
              .map((it) => `<li>${escapeHtml(it)}</li>`)
              .join("")}</ul></div>`
        )
        .join("")}</div>`;

    const yearTags = (rows) =>
      `<div class="svc-years">${rows
        .map(
          (r) =>
            `<div class="svc-year-row"><div class="svc-year">${escapeHtml(
              String(r.year)
            )}</div><div class="svc-tags">${r.items
              .map((it) => `<span class="svc-tag">${escapeHtml(it)}</span>`)
              .join("")}</div></div>`
        )
        .join("")}</div>`;

    wrap.innerHTML = [
      s.journals?.length && block("Journal reviewer", tags(s.journals)),
      s.organizing?.length && block("Organizing committees", yearRows(s.organizing)),
      s.pcMembership?.length && block("Program committee membership", yearTags(s.pcMembership)),
    ]
      .filter(Boolean)
      .join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
