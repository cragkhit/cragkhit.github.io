/* global React, ReactDOM */
const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

/* Edit-mode context — single source of truth so Editables re-render
   when mode flips, instead of reading document.body.dataset.mode. */
const EditContext = createContext(false);

/* ============================================================
   Storage
   ============================================================ */
const STORAGE_KEY = "mycv:data:v1";
const THEME_KEY = "mycv:theme";
const MODE_KEY = "mycv:mode";

function loadCV() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // migrate: tagline used to be a string
      if (data?.meta && typeof data.meta.tagline === "string") {
        data.meta.tagline = data.meta.tagline.split(/\s*·\s*/).filter(Boolean);
      }
      return data;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(window.DEFAULT_CV));
}
function saveCV(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}

/* ============================================================
   Editable text — contentEditable that emits string updates
   ============================================================ */
function Editable({ value, onChange, as = "span", placeholder = "—", className, multiline = false, ...rest }) {
  const Tag = as;
  const ref = useRef(null);
  const inEdit = useContext(EditContext);

  // Keep DOM in sync only when value changes from the outside; avoid blowing
  // away the caret on every keystroke.
  useEffect(() => {
    if (ref.current && ref.current.innerText !== (value || "")) {
      ref.current.innerText = value || "";
    }
  }, [value]);

  const handleInput = (e) => {
    const txt = e.currentTarget.innerText;
    onChange(txt);
    e.currentTarget.dataset.empty = txt.trim() === "" ? "1" : "0";
  };
  const handleKey = (e) => {
    if (!multiline && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
  };

  return (
    <Tag
      ref={ref}
      data-edit="1"
      data-placeholder={placeholder}
      data-empty={value && value.trim() ? "0" : "1"}
      contentEditable={inEdit}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKey}
      className={className}
      spellCheck={inEdit}
      {...rest}
    />
  );
}

/* ============================================================
   Path helpers — set a deeply nested value immutably
   ============================================================ */
function setIn(obj, path, val) {
  const parts = Array.isArray(path) ? path : path.split(".");
  if (parts.length === 0) return val;
  const [head, ...rest] = parts;
  const isArr = Array.isArray(obj);
  const next = isArr ? [...obj] : { ...(obj || {}) };
  next[head] = setIn(obj?.[head], rest, val);
  return next;
}

/* ============================================================
   Row actions — add / remove buttons that appear on hover in edit
   ============================================================ */
function RowActions({ onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className="row-actions" contentEditable={false}>
      {onMoveUp && <button className="ec-btn" onClick={onMoveUp} title="Move up">↑</button>}
      {onMoveDown && <button className="ec-btn" onClick={onMoveDown} title="Move down">↓</button>}
      {onRemove && <button className="ec-btn danger" onClick={onRemove} title="Remove">×</button>}
    </div>
  );
}

function AddRowButton({ onClick, label }) {
  return (
    <button className="add-section-btn" onClick={onClick}>+ Add {label}</button>
  );
}

Object.assign(window, { useState, useEffect, useMemo, useRef, useCallback, useContext, Editable, EditContext, setIn, RowActions, AddRowButton, loadCV, saveCV, STORAGE_KEY, THEME_KEY, MODE_KEY });

/* ============================================================
   MonthYearPicker — display "May 2022" / "Present"; edit via
   native <input type="month"> + a "Present" toggle (for end dates).
   ============================================================ */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function parseMonthYear(s) {
  if (!s) return null;
  const m = s.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const idx = MONTHS.findIndex(x => x.toLowerCase() === m[1].toLowerCase());
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
  }
  const y = s.trim().match(/^(\d{4})$/);
  if (y) return `${y[1]}-01`;
  return null;
}
function formatMonthYear(iso, originalHadMonth) {
  if (!iso) return "";
  const [y, mo] = iso.split("-");
  if (!originalHadMonth) return y;
  return `${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
}
function MonthYearPicker({ value, onChange, allowPresent = false, editing }) {
  const inEdit = editing ?? (document.body?.dataset?.mode === "edit");
  const isPresent = /^present$/i.test((value || "").trim());

  if (!inEdit) {
    return <span>{value || "—"}</span>;
  }

  const iso = parseMonthYear(value) || "";
  const hadMonth = /^[A-Za-z]+\s+\d{4}$/.test((value || "").trim());

  return (
    <span style={{display: "inline-flex", alignItems: "center", gap: 4}} contentEditable={false}>
      {isPresent ? (
        <span style={{fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)"}}>Present</span>
      ) : (
        <input
          type="month"
          value={iso}
          onChange={(e) => onChange(formatMonthYear(e.target.value, true))}
          style={{
            font: "inherit", fontFamily: "var(--mono)", fontSize: 11,
            color: "var(--ink)", background: "var(--bg)",
            border: "1px solid var(--rule)", borderRadius: 3,
            padding: "2px 4px", outline: "none"
          }}
        />
      )}
      {allowPresent && (
        <button
          className="ec-btn"
          style={{width: "auto", height: 18, padding: "0 6px", fontSize: 10}}
          onClick={() => onChange(isPresent ? formatMonthYear(new Date().toISOString().slice(0, 7), true) : "Present")}
          title="Toggle Present"
        >
          {isPresent ? "set date" : "Present"}
        </button>
      )}
    </span>
  );
}

Object.assign(window, { MonthYearPicker });
