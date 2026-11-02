/**
 * Populate public/asl with fingerspelling + word sign images.
 * Tries Wikimedia Commons thumbnails first; falls back to generated SVG placeholders.
 *
 * Run: node scripts/fetch-asl-assets.mjs
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "public", "asl");
const FINGERSPELL_DIR = path.join(ROOT, "fingerspell");
const WORDS_DIR = path.join(ROOT, "words");

/** Commons file titles for ASL manual alphabet (right hand). */
const FINGERSPELL_COMMONS = {
  a: "American_Sign_Language_ASL_alphabet_A.svg",
  b: "American_Sign_Language_ASL_alphabet_B.svg",
  c: "American_Sign_Language_ASL_alphabet_C.svg",
  d: "American_Sign_Language_ASL_alphabet_D.svg",
  e: "American_Sign_Language_ASL_alphabet_E.svg",
  f: "American_Sign_Language_ASL_alphabet_F.svg",
  g: "American_Sign_Language_ASL_alphabet_G.svg",
  h: "American_Sign_Language_ASL_alphabet_H.svg",
  i: "American_Sign_Language_ASL_alphabet_I.svg",
  j: "American_Sign_Language_ASL_alphabet_J.svg",
  k: "American_Sign_Language_ASL_alphabet_K.svg",
  l: "American_Sign_Language_ASL_alphabet_L.svg",
  m: "American_Sign_Language_ASL_alphabet_M.svg",
  n: "American_Sign_Language_ASL_alphabet_N.svg",
  o: "American_Sign_Language_ASL_alphabet_O.svg",
  p: "American_Sign_Language_ASL_alphabet_P.svg",
  q: "American_Sign_Language_ASL_alphabet_Q.svg",
  r: "American_Sign_Language_ASL_alphabet_R.svg",
  s: "American_Sign_Language_ASL_alphabet_S.svg",
  t: "American_Sign_Language_ASL_alphabet_T.svg",
  u: "American_Sign_Language_ASL_alphabet_U.svg",
  v: "American_Sign_Language_ASL_alphabet_V.svg",
  w: "American_Sign_Language_ASL_alphabet_W.svg",
  x: "American_Sign_Language_ASL_alphabet_X.svg",
  y: "American_Sign_Language_ASL_alphabet_Y.svg",
  z: "American_Sign_Language_ASL_alphabet_Z.svg",
};

const WORD_COMMONS = {
  hello: "American_Sign_Language_ASL_hello.svg",
  thank_you: "American_Sign_Language_ASL_thank_you.svg",
  please: "American_Sign_Language_ASL_please.svg",
  yes: "American_Sign_Language_ASL_yes.svg",
  no: "American_Sign_Language_ASL_no.svg",
  help: "American_Sign_Language_ASL_help.svg",
  love: "American_Sign_Language_ASL_love.svg",
  water: "American_Sign_Language_ASL_water.svg",
  home: "American_Sign_Language_ASL_home.svg",
  school: "American_Sign_Language_ASL_school.svg",
};

const WORD_IDS = [
  "hello",
  "thank_you",
  "please",
  "sorry",
  "yes",
  "no",
  "help",
  "name",
  "friend",
  "family",
  "love",
  "like",
  "want",
  "need",
  "go",
  "come",
  "stop",
  "wait",
  "eat",
  "drink",
  "water",
  "food",
  "home",
  "school",
  "work",
  "teacher",
  "student",
  "learn",
  "read",
  "write",
  "talk",
  "hear",
  "deaf",
  "happy",
  "sad",
  "angry",
  "tired",
  "good",
  "bad",
  "morning",
  "night",
  "today",
  "tomorrow",
  "yesterday",
  "where",
  "what",
  "who",
  "why",
  "how",
  "when",
  "bathroom",
  "doctor",
  "mother",
  "father",
  "boy",
  "girl",
  "man",
  "woman",
  "child",
  "baby",
  "dog",
  "cat",
  "understand",
  "know",
  "fine",
  "ok",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function commonsDirectUrl(fileTitle) {
  const encoded = encodeURIComponent(fileTitle.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`;
}

async function downloadToFile(url, dest) {
  const response = await fetch(url, {
    headers: { "User-Agent": "brennansportfolio-asl-fetch/1.0 (educational)" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, buffer);
}

function placeholderSvg(label, subtitle) {
  const safeLabel = label.replace(/[<>&"]/g, "");
  const safeSub = subtitle.replace(/[<>&"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400">
  <rect width="320" height="400" rx="24" fill="#0f172a"/>
  <rect x="16" y="16" width="288" height="368" rx="16" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
  <text x="160" y="200" text-anchor="middle" font-family="system-ui,sans-serif" font-size="72" font-weight="700" fill="#f8fafc">${safeLabel}</text>
  <text x="160" y="260" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#94a3b8">${safeSub}</text>
  <text x="160" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#64748b">ASL placeholder</text>
</svg>`;
}

async function ensureFingerspell(letter) {
  const dest = path.join(FINGERSPELL_DIR, `${letter}.svg`);
  if (await exists(dest)) return "skip";

  const commons = FINGERSPELL_COMMONS[letter];
  if (commons) {
    try {
      await downloadToFile(commonsDirectUrl(commons), dest);
      return "commons";
    } catch (err) {
      console.warn(`  fingerspell ${letter}: commons failed (${err.message}), using placeholder`);
    }
  }

  await writeFile(
    dest,
    placeholderSvg(letter.toUpperCase(), "Fingerspell"),
    "utf8",
  );
  return "placeholder";
}

async function ensureWord(id) {
  const dest = path.join(WORDS_DIR, `${id}.svg`);
  if (await exists(dest)) return "skip";

  const commons = WORD_COMMONS[id];
  if (commons) {
    try {
      await downloadToFile(commonsDirectUrl(commons), dest);
      return "commons";
    } catch (err) {
      console.warn(`  word ${id}: commons failed (${err.message}), using placeholder`);
    }
  }

  const label = id.replace(/_/g, " ").toUpperCase();
  await writeFile(dest, placeholderSvg(label, "Sign gloss"), "utf8");
  return "placeholder";
}

async function main() {
  await mkdir(FINGERSPELL_DIR, { recursive: true });
  await mkdir(WORDS_DIR, { recursive: true });

  console.log("Fingerspelling…");
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    const result = await ensureFingerspell(letter);
    console.log(`  ${letter}: ${result}`);
  }

  console.log("Word signs…");
  for (const id of WORD_IDS) {
    const result = await ensureWord(id);
    console.log(`  ${id}: ${result}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
