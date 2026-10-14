#!/usr/bin/env node
/**
 * Publishes cv-data.json — the file you edit — to the places pages read from.
 *
 *   node tools/firebase-sync.mjs build-js           # cv-data.json -> cv-data.js
 *   node tools/firebase-sync.mjs push [--dry-run]   # cv-data.json -> Firestore cv/main
 *
 * cv-data.js is the static fallback every page renders first; Firestore is the
 * live copy they switch to (see cv-live.js). Both are derived from
 * cv-data.json and nothing writes back, so there is no merge to get wrong.
 *
 * The CV is stored as one JSON string, not a Firestore map: maps come back
 * with their keys sorted, which would reorder fields the pages render in
 * order. Credentials for push come from FIREBASE_SERVICE_ACCOUNT (the key
 * file's JSON) or GOOGLE_APPLICATION_CREDENTIALS (a path to it).
 * .github/workflows/cv-sync.yml runs both commands on every change.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = join(REPO, "cv-data.json");
const JS_PATH = join(REPO, "cv-data.js");

// MyCV's serializer is a browser script; run it against a stand-in window so
// cv-data.js keeps exactly the layout it has always had.
function serializer() {
  const win = {};
  new Function("window", readFileSync(join(REPO, "MyCV/cv-serialize.js"), "utf8"))(win);
  return win.cvSerialize;
}

function loadCV() {
  let cv;
  try {
    cv = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  } catch (err) {
    throw new Error(`cv-data.json is not valid JSON — ${err.message}`);
  }
  if (!cv?.meta?.name || !Array.isArray(cv.publications)) {
    throw new Error("cv-data.json is missing meta.name or publications[]");
  }
  return cv;
}

function buildJs() {
  const next = serializer().serialize(loadCV());
  const prev = readFileSync(JS_PATH, "utf8");
  if (prev === next) {
    console.log("cv-data.js already up to date");
    return;
  }
  writeFileSync(JS_PATH, next);
  console.log("cv-data.js regenerated");
}

async function push({ dryRun }) {
  const cv = loadCV();
  // The same text cv-live.js compares against the static copy.
  const json = serializer().serializeJson(cv);
  const hash = createHash("sha256").update(json).digest("hex");

  const { initializeApp, cert, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  initializeApp({ credential: raw ? cert(JSON.parse(raw)) : applicationDefault() });

  const ref = getFirestore().doc("cv/main");
  const current = await ref.get();
  if (current.exists && current.get("hash") === hash) {
    console.log(`Firestore cv/main already up to date (${hash.slice(0, 12)})`);
    return;
  }

  const summary = `${cv.publications.length} publications, ${(json.length / 1024).toFixed(0)} KB`;
  if (dryRun) {
    console.log(`would write cv/main: ${summary}, hash ${hash.slice(0, 12)}`);
    return;
  }
  await ref.set({
    json,
    hash,
    sourceCommit: process.env.GITHUB_SHA || null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`wrote cv/main: ${summary}, hash ${hash.slice(0, 12)}`);
}

const [cmd, ...flags] = process.argv.slice(2);
try {
  if (cmd === "build-js") buildJs();
  else if (cmd === "push") await push({ dryRun: flags.includes("--dry-run") });
  else {
    console.error("usage: node tools/firebase-sync.mjs build-js | push [--dry-run]");
    process.exit(2);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
