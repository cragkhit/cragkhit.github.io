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

  const VENUE_ACRONYM_MAP = [
    [/^Journal of Systems and Software/i, "JSS"],
    [/^Empirical Software Engineering/i, "EMSE"],
    [/^IEEE Transactions on Software Engineering/i, "TSE"],
    [/^ACM Transactions on Software Engineering and Methodology/i, "TOSEM"],
    [/^Information and Software Technology/i, "IST"],
    [/^IEEE Access/i, "IEEE Access"],
    [/^Software: Practice and Experience/i, "SPE"],
    [/^Science of Computer Programming/i, "SCP"],
    [/^Software Quality Journal/i, "SQJ"],
  ];

  // Full names for conference / workshop acronyms. The acronym in the venue
  // string is expanded inline to "Full Name (ACRONYM)" so the audience knows
  // what each venue stands for.
  const VENUE_FULL_NAME = {
    MSR:    "International Conference on Mining Software Repositories",
    ICAART: "International Conference on Agents and Artificial Intelligence",
    APSEC:  "Asia-Pacific Software Engineering Conference",
    InCIT:  "International Conference on Information Technology",
    ASE:    "International Conference on Automated Software Engineering",
    ICSME:  "International Conference on Software Maintenance and Evolution",
    SBES:   "Brazilian Symposium on Software Engineering",
    NLDB:   "International Conference on Natural Language & Information Systems",
    SANER:  "International Conference on Software Analysis, Evolution and Reengineering",
    ESEM:   "International Symposium on Empirical Software Engineering and Measurement",
    JCSSE:  "International Joint Conference on Computer Science and Software Engineering",
    AINA:   "International Conference on Advanced Information Networking and Applications",
    ICPC:   "International Conference on Program Comprehension",
    SCAM:   "International Working Conference on Source Code Analysis and Manipulation",
    ICST:   "IEEE International Conference on Software Testing, Verification and Validation",
    SSBSE:  "International Symposium on Search-Based Software Engineering",
    IWSC:   "International Workshop on Software Clones",
    IWESEP: "International Workshop on Empirical Software Engineering in Practice",
    QuASoQ: "International Workshop on Quantitative Approaches to Software Quality",
  };

  // --- State -------------------------------------------------------------
  const state = {
    typeFilter: "all",
    yearFilter: "all",
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

  function extractAcronym(venue) {
    if (!venue) return null;
    for (const [re, ac] of VENUE_ACRONYM_MAP) {
      if (re.test(venue)) return ac;
    }
    const paren = venue.match(/\(([A-Z][A-Z0-9]{1,9})(?:\s+['']?\d|\s|\))/);
    if (paren) return paren[1];
    const bare = venue.match(/\b([A-Z][A-Z0-9]{1,9}(?:\/[A-Z]+)?)\b(?=\s*[''']\s*\d|\s+\d{4})/);
    if (bare) return bare[1];
    return null;
  }

  function highlightAcronym(venue, acronym) {
    if (!acronym) return escapeHtml(venue);
    const re = new RegExp("\\b" + acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    const m = re.exec(venue);
    if (!m) return escapeHtml(venue);
    const full = VENUE_FULL_NAME[acronym];
    const acHtml = `<span class="acronym">${escapeHtml(m[0])}</span>`;
    const replacement = full
      ? `<span class="venue-full">${escapeHtml(full)}</span> (${acHtml})`
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
    const acronym = extractAcronym(p.venue);
    const venueHtml = highlightAcronym(p.venue || "", acronym);
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
