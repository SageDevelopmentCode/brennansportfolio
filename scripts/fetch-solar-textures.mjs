/**
 * Download 2K solar system textures into public/solar-system/textures/
 * Source: Solar System Scope (CC BY 4.0) — https://www.solarsystemscope.com/textures/
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "solar-system", "textures");

const DOWNLOADS = [
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_sun.jpg",
    file: "sun.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_mercury.jpg",
    file: "mercury.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg",
    file: "venus.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg",
    file: "earth.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg",
    file: "earth_clouds.png",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_mars.jpg",
    file: "mars.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg",
    file: "jupiter.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg",
    file: "saturn.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png",
    file: "saturn_ring.png",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg",
    file: "uranus.jpg",
  },
  {
    url: "https://www.solarsystemscope.com/textures/download/2k_neptune.jpg",
    file: "neptune.jpg",
  },
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, buffer);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { url, file } of DOWNLOADS) {
    const dest = path.join(OUT_DIR, file);
    if (await exists(dest)) {
      console.log(`skip ${file} (already exists)`);
      continue;
    }
    console.log(`fetch ${file}…`);
    await download(url, dest);
    console.log(`wrote ${dest}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
