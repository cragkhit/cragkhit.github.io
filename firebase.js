/**
 * The site's one Firebase app, shared by cv-live.js and Analytics. Every
 * main page loads it, directly or through cv-live.js:
 *
 *   <script type="module" src="firebase.js"></script>
 *
 * Modules are evaluated once per page, so importing it from several places
 * never initialises Firebase twice. The config is public by design —
 * firestore.rules make the CV read-only to browsers.
 */

export const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.14.1";

// From Firebase console → Project settings → Your apps.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDckiXNe1TzUamo0b2gKRiu9gQ5memOtO8",
  authDomain: "cragkhit-cv.firebaseapp.com",
  projectId: "cragkhit-cv",
  storageBucket: "cragkhit-cv.firebasestorage.app",
  messagingSenderId: "959158317054",
  appId: "1:959158317054:web:3ea6cafa2ff5c2b9d3daaf",
  measurementId: "G-26E5H74S9Z",
};

const { initializeApp } = await import(`${FIREBASE_SDK}/firebase-app.js`);
export const app = initializeApp(FIREBASE_CONFIG);

// Page views go to Google Analytics. Skipped where the browser can't support
// it (blocked cookies, an ad blocker), and never allowed to break the page.
(async () => {
  try {
    const { getAnalytics, isSupported } = await import(`${FIREBASE_SDK}/firebase-analytics.js`);
    if (await isSupported()) getAnalytics(app);
  } catch (err) {
    console.warn("firebase: analytics unavailable —", err.message);
  }
})();
