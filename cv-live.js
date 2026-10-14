/**
 * Keeps window.DEFAULT_CV live: pages render from the static cv-data.js
 * first, then this swaps in the Firestore copy and announces every change
 * with a `cv:update` event on window. Listeners just re-render.
 *
 * Load after cv-data.js:  <script type="module" src="cv-live.js"></script>
 *
 * Firestore holds cv/main.json, written by tools/firebase-sync.mjs from
 * cv-data.json. If Firebase is unreachable the static render simply stays.
 * The web config below is public by design — firestore.rules make the CV
 * read-only to browsers.
 */

const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.14.1";

// Paste the config from Firebase console → Project settings → Your apps.
// Left null, pages use the static cv-data.js only.
const FIREBASE_CONFIG = null;

async function start() {
  if (!FIREBASE_CONFIG) return;
  const { initializeApp } = await import(`${FIREBASE_SDK}/firebase-app.js`);
  const { getFirestore, doc, onSnapshot } = await import(`${FIREBASE_SDK}/firebase-firestore.js`);

  const db = getFirestore(initializeApp(FIREBASE_CONFIG));
  // Same text firebase-sync.mjs stores, so an unchanged CV causes no re-render.
  let shown = window.DEFAULT_CV ? JSON.stringify(window.DEFAULT_CV, null, 2) + "\n" : "";

  onSnapshot(
    doc(db, "cv", "main"),
    (snap) => {
      const json = snap.exists() ? snap.get("json") : null;
      if (!json || json === shown) return;
      shown = json;
      window.DEFAULT_CV = JSON.parse(json);
      window.dispatchEvent(new CustomEvent("cv:update", { detail: window.DEFAULT_CV }));
    },
    (err) => console.warn("cv-live: showing the static CV —", err.message)
  );
}

start().catch((err) => console.warn("cv-live: showing the static CV —", err.message));
