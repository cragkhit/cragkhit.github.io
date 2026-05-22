// cv-auth.js — password-gated edit mode via PBKDF2 + AES-GCM
// The password never leaves the browser; only an encrypted verification
// token is stored in localStorage. Wrong password → decryption fails.

const _AUTH = (() => {
  const SALT_KEY    = "mycv:auth:salt";
  const TOKEN_KEY   = "mycv:auth:token";
  const IV_KEY      = "mycv:auth:iv";
  const MARKER      = "cv-edit-ok-v1";
  const ITERATIONS  = 100000;

  function enc64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function dec64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  async function deriveKey(password, salt) {
    const raw = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
      raw,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // First-time setup: encrypt the marker with the chosen password.
  async function setup(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKey(password, salt);
    const ct   = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(MARKER)
    );
    localStorage.setItem(SALT_KEY,  enc64(salt));
    localStorage.setItem(IV_KEY,    enc64(iv));
    localStorage.setItem(TOKEN_KEY, enc64(ct));
    return key; // caller keeps in memory for the session
  }

  // Returns the derived key on success, null on wrong password.
  async function verify(password) {
    const saltB64  = localStorage.getItem(SALT_KEY);
    const ivB64    = localStorage.getItem(IV_KEY);
    const tokenB64 = localStorage.getItem(TOKEN_KEY);
    if (!saltB64 || !ivB64 || !tokenB64) return null;
    try {
      const salt  = dec64(saltB64);
      const iv    = dec64(ivB64);
      const token = dec64(tokenB64);
      const key   = await deriveKey(password, salt);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, token);
      const text  = new TextDecoder().decode(plain);
      return text === MARKER ? key : null;
    } catch {
      return null;
    }
  }

  function isSetup() {
    return !!(localStorage.getItem(SALT_KEY) && localStorage.getItem(TOKEN_KEY));
  }

  // Removes the stored token (effectively resets the password).
  function reset() {
    [SALT_KEY, IV_KEY, TOKEN_KEY].forEach(k => localStorage.removeItem(k));
  }

  return { setup, verify, isSetup, reset };
})();

window.cvAuth = _AUTH;
