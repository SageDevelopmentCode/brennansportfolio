/** One-off: test /quote for each curated symbol. Run: node --env-file=.env.local scripts/check-fmp-featured.mjs */
const FEATURED = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX", "DIS", "NKE", "SBUX",
  "KO", "PEP", "WMT", "TGT", "COST", "RBLX", "SNAP", "UBER", "SONY", "NVDA", "AMD",
  "INTC", "BA", "F", "GM", "SPY",
];

const PENNY = [
  "NIO", "SOFI", "NOK", "RIOT", "LCID", "AAL", "RIVN", "CCL",
];

const SYMBOLS = [...FEATURED, ...PENNY];

const key = process.env.FMP_API_KEY?.trim();
if (!key) {
  console.error("Missing FMP_API_KEY");
  process.exit(1);
}

const base = "https://financialmodelingprep.com/stable/quote";

async function check(symbol) {
  const url = `${base}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  const text = await res.text();
  let ok = false;
  try {
    const p = JSON.parse(text);
    ok = res.ok && Array.isArray(p) && p.length > 0 && typeof p[0]?.price === "number";
  } catch {
    ok = false;
  }
  if (!ok) {
    const reason = text.trim().slice(0, 80).replace(/\s+/g, " ");
    return { symbol, ok: false, status: res.status, reason };
  }
  return { symbol, ok: true, status: res.status };
}

const results = await Promise.all(SYMBOLS.map(check));
const bad = results.filter((r) => !r.ok);
const good = results.filter((r) => r.ok);
console.log("OK", good.length, good.map((r) => r.symbol).join(", "));
console.log("FAIL", bad.length);
for (const r of bad) console.log(" ", r.symbol, r.status, r.reason);
