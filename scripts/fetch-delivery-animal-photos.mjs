/**
 * Download Wikipedia summary thumbnails into public/delivery/animals/{id}.jpg
 * Skips ids that already have a local image (e.g. AI mythic / unicorn art).
 */
import { writeFile, readdir } from "node:fs/promises";
import path from "node:path";

/** Do not overwrite AI art for make-believe couriers. */
const SKIP_IDS = new Set([
  "pegasus",
  "phoenix",
  "griffin",
  "basilisk",
  "hydra",
  "kraken",
  "dragon",
  "leviathan",
  "chimera",
  "storm_serpent",
  "cosmic_serpent",
  "golden_kraken",
  "sky_titan",
]);

const REAL_IDS = [
  "mosquito",
  "ant",
  "snail",
  "frog",
  "bee",
  "wasp",
  "bat",
  "rabbit",
  "duck",
  "chicken",
  "crab",
  "lobster",
  "turtle",
  "goose",
  "goat",
  "pig",
  "snake",
  "fox",
  "raccoon",
  "skunk",
  "otter",
  "beaver",
  "turkey",
  "owl",
  "penguin",
  "llama",
  "kangaroo",
  "koala",
  "parrot",
  "flamingo",
  "peacock",
  "cheetah",
  "zebra",
  "horse",
  "cow",
  "rhino",
  "hippo",
  "giraffe",
  "sloth",
  "elephant",
  "squirrel",
  "hedgehog",
  "deer",
  "bald_eagle",
  "wolf",
  "bear",
  "moose",
  "seal",
  "walrus",
  "octopus",
  "dolphin",
  "shark",
  "tiger",
  "lion",
  "camel",
  "bison",
  "leopard",
  "panda",
  "gorilla",
  "polar_bear",
  "giant_squid",
  "blue_whale",
];

const WIKI_TITLES = {
  mosquito: "Mosquito",
  ant: "Ant",
  snail: "Snail",
  frog: "Frog",
  bee: "Bee",
  wasp: "Wasp",
  bat: "Bat",
  rabbit: "Rabbit",
  duck: "Duck",
  chicken: "Chicken",
  crab: "Crab",
  lobster: "Lobster",
  turtle: "Turtle",
  goose: "Goose",
  goat: "Goat",
  pig: "Pig",
  snake: "Snake",
  fox: "Red fox",
  raccoon: "Raccoon",
  skunk: "Skunk",
  otter: "Otter",
  beaver: "Beaver",
  turkey: "Wild turkey",
  owl: "Owl",
  penguin: "Penguin",
  llama: "Llama",
  kangaroo: "Kangaroo",
  koala: "Koala",
  parrot: "Parrot",
  flamingo: "Flamingo",
  peacock: "Indian peafowl",
  cheetah: "Cheetah",
  zebra: "Zebra",
  horse: "Horse",
  cow: "Cattle",
  rhino: "Rhinoceros",
  hippo: "Hippopotamus",
  giraffe: "Giraffe",
  sloth: "Sloth",
  elephant: "African bush elephant",
  squirrel: "Squirrel",
  hedgehog: "Hedgehog",
  deer: "White-tailed deer",
  bald_eagle: "Bald eagle",
  wolf: "Wolf",
  bear: "American black bear",
  moose: "Moose",
  seal: "Harbor seal",
  walrus: "Walrus",
  octopus: "Common octopus",
  dolphin: "Common bottlenose dolphin",
  shark: "Great white shark",
  tiger: "Tiger",
  lion: "Lion",
  camel: "Dromedary",
  bison: "American bison",
  leopard: "Leopard",
  panda: "Giant panda",
  gorilla: "Western gorilla",
  polar_bear: "Polar bear",
  giant_squid: "Giant squid",
  blue_whale: "Blue whale",
};

const OUT_DIR = path.join("public", "delivery", "animals");
const UA = "SkateDropPortfolio/1.0 (educational; local dev)";

async function hasLocalImage(id) {
  const names = await readdir(OUT_DIR);
  return names.some((name) => name.startsWith(`${id}.`));
}

async function fetchOne(id) {
  if (SKIP_IDS.has(id)) {
    return { id, status: "fantasy skip" };
  }
  if (await hasLocalImage(id)) {
    return { id, status: "skipped" };
  }
  const title = encodeURIComponent(WIKI_TITLES[id] ?? id);
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
  const summaryRes = await fetch(summaryUrl, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!summaryRes.ok) {
    return { id, status: `summary ${summaryRes.status}` };
  }
  const summary = await summaryRes.json();
  const src = summary.thumbnail?.source;
  if (!src) {
    return { id, status: "no thumbnail" };
  }
  const imgRes = await fetch(src, { headers: { "User-Agent": UA } });
  if (!imgRes.ok) {
    return { id, status: `image ${imgRes.status}` };
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const ext = src.toLowerCase().includes(".png") ? "png" : "jpg";
  await writeFile(path.join(OUT_DIR, `${id}.${ext}`), buf);
  return { id, status: ext };
}

async function main() {
  const results = [];
  for (const id of REAL_IDS) {
    results.push(await fetchOne(id));
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
