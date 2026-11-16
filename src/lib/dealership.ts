export type CatalogVehicle = {
  id: string;
  name: string;
  price: number;
  desc: string;
  bike: boolean;
  color: string;
};

export type VehicleCondition = "Excellent" | "Good" | "Fair" | "Rough";

export type VehicleSpecs = {
  vin: string;
  year: number;
  mileage: number;
  condition: VehicleCondition;
  colorLabel: string;
};

export type LotFilter = "all" | "cars" | "bikes" | "trucks" | "special";

export type SaleRecord = {
  ask: number;
  cost: number;
  saleLogId: string;
};

export type LotState = {
  askById: Record<string, number>;
  stockById: Record<string, number>;
  totalProfit: number;
  /** One-time migration payload; cleared after CRM backfill. */
  legacySales?: Record<string, SaleRecord>;
};

export const DEFAULT_VEHICLE_STOCK = 1;
export const MAX_VEHICLE_STOCK = 99;

export const LOT_FILTERS: { id: LotFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cars", label: "Cars" },
  { id: "bikes", label: "Bikes" },
  { id: "trucks", label: "Trucks" },
  { id: "special", label: "Special" },
];

const STORAGE_KEY = "rush-motors-lot-v3";
const LEGACY_STORAGE_KEY = "rush-motors-lot-v1";
const PREV_STORAGE_KEY = "rush-motors-lot-v2";
const STARTER_PRICE = 2500;
export const ACQUISITION_RATE = 0.7;

const CONDITIONS: VehicleCondition[] = ["Excellent", "Good", "Fair", "Rough"];

const TRUCK_IDS = new Set([
  "monster",
  "tractor",
  "bus",
  "ambulance",
  "diesel",
  "tank",
  "truck",
  "firetruck",
  "trophy",
]);

const SPECIAL_IDS = new Set([
  "hover",
  "finger",
  "corkscrew",
  "skycar",
  "moonlander",
  "rocket",
  "shifter",
  "sleigh",
  "saucer",
  "trackracer",
  "roadster",
  "snowmobile",
  "train",
  "unbreakable",
  "unbreakableLava",
  "unbreakableWater",
  "unbreakableLightning",
  "unbreakableGhost",
]);

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function emptyLot(): LotState {
  return { askById: {}, stockById: {}, totalProfit: 0 };
}

export function stockForVehicle(lot: LotState, vehicleId: string): number {
  const raw = lot.stockById[vehicleId];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(MAX_VEHICLE_STOCK, Math.round(raw)));
  }
  return DEFAULT_VEHICLE_STOCK;
}

export function isOutOfStock(lot: LotState, vehicleId: string): boolean {
  return stockForVehicle(lot, vehicleId) <= 0;
}

/** @deprecated Use isOutOfStock — kept for call-site clarity where “sold” means none left. */
export function isSold(lot: LotState, vehicleId: string): boolean {
  return isOutOfStock(lot, vehicleId);
}

export function stickerPrice(price: number): number {
  return price > 0 ? price : STARTER_PRICE;
}

export function defaultAsk(vehicle: Pick<CatalogVehicle, "price">): number {
  return stickerPrice(vehicle.price);
}

export function resolveAsk(lot: LotState, vehicle: Pick<CatalogVehicle, "id" | "price">): number {
  const override = lot.askById[vehicle.id];
  if (typeof override === "number" && Number.isFinite(override) && override >= 1) {
    return Math.round(override);
  }
  return defaultAsk(vehicle);
}

export function acquisitionCost(ask: number): number {
  return Math.round(Math.max(1, ask) * ACQUISITION_RATE);
}

export function saleProfit(ask: number, cost: number): number {
  return Math.max(0, Math.round(ask) - Math.round(cost));
}

export function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatMileage(miles: number): string {
  return `${miles.toLocaleString("en-US")} mi`;
}

export function vehicleVin(id: string): string {
  const h = hashId(id);
  const body = (h.toString(36).toUpperCase() + "0000000000000000").slice(0, 12);
  return `RUSH${body}`.slice(0, 17);
}

export function vehicleSpecs(id: string, colorHex: string): VehicleSpecs {
  const h = hashId(id);
  return {
    vin: vehicleVin(id),
    year: 2012 + (h % 13),
    mileage: 8000 + (h % 134_000),
    condition: CONDITIONS[h % CONDITIONS.length],
    colorLabel: colorLabel(colorHex),
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function colorLabel(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "Custom";
  const { r, g, b } = rgb;
  if (r > 230 && g > 230 && b > 230) return "White";
  if (r < 40 && g < 40 && b < 40) return "Black";
  if (r > 200 && g > 200 && b < 120) return "Yellow";
  if (r > 200 && g < 120 && b < 120) return "Red";
  if (r < 120 && g > 160 && b < 120) return "Green";
  if (r < 120 && g < 160 && b > 200) return "Blue";
  if (r > 120 && g < 120 && b > 160) return "Purple";
  if (r > 200 && g > 120 && b < 80) return "Orange";
  if (r > 160 && g > 160 && b > 160) return "Silver";
  return "Custom";
}

export function lotCategory(vehicle: CatalogVehicle): Exclude<LotFilter, "all"> {
  if (vehicle.bike) return "bikes";
  if (TRUCK_IDS.has(vehicle.id)) return "trucks";
  if (SPECIAL_IDS.has(vehicle.id)) return "special";
  return "cars";
}

function coerceAskMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 1) continue;
    out[id] = Math.round(value);
  }
  return out;
}

function coerceStockMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    out[id] = Math.max(0, Math.min(MAX_VEHICLE_STOCK, Math.round(value)));
  }
  return out;
}

function coerceSales(raw: unknown): Record<string, SaleRecord> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, SaleRecord> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const sale = value as { ask?: unknown; cost?: unknown };
    if (typeof sale.ask !== "number" || !Number.isFinite(sale.ask)) continue;
    if (typeof sale.cost !== "number" || !Number.isFinite(sale.cost)) continue;
    const saleLogId =
      typeof (sale as { saleLogId?: unknown }).saleLogId === "string"
        ? (sale as { saleLogId: string }).saleLogId
        : `legacy-${id}`;
    out[id] = {
      ask: Math.round(sale.ask),
      cost: Math.round(sale.cost),
      saleLogId,
    };
  }
  return out;
}

function migrateV1(): LotState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const record = data as { soldIds?: unknown; earned?: unknown };
    const soldIds = Array.isArray(record.soldIds)
      ? record.soldIds.filter((id): id is string => typeof id === "string")
      : [];
    const sales: Record<string, SaleRecord> = {};
    let totalProfit = 0;
    for (const id of soldIds) {
      const ask = STARTER_PRICE;
      const cost = acquisitionCost(ask);
      sales[id] = { ask, cost, saleLogId: `legacy-v1-${id}` };
      totalProfit += saleProfit(ask, cost);
    }
    return {
      askById: {},
      stockById: Object.fromEntries(soldIds.map((id) => [id, 0])),
      totalProfit,
      legacySales: sales,
    };
  } catch {
    return null;
  }
}

function migrateV2ToV3(record: {
  askById?: unknown;
  sales?: unknown;
  totalProfit?: unknown;
  stockById?: unknown;
}): LotState {
  const askById = coerceAskMap(record.askById);
  const legacySales = coerceSales(record.sales);
  const stockById = coerceStockMap(record.stockById);
  for (const vehicleId of Object.keys(legacySales)) {
    stockById[vehicleId] = 0;
  }
  return {
    askById,
    stockById,
    totalProfit:
      typeof record.totalProfit === "number" && Number.isFinite(record.totalProfit)
        ? Math.max(0, Math.round(record.totalProfit))
        : 0,
    legacySales: Object.keys(legacySales).length > 0 ? legacySales : undefined,
  };
}

export function loadLot(): LotState {
  if (typeof window === "undefined") return emptyLot();
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(PREV_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as unknown;
        if (data && typeof data === "object") {
          const migrated = migrateV2ToV3(data as Record<string, unknown>);
          saveLot(migrated);
          return migrated;
        }
      }
      const migrated = migrateV1();
      if (migrated) {
        saveLot(migrated);
        return migrated;
      }
      return emptyLot();
    }
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return emptyLot();
    const record = data as {
      askById?: unknown;
      stockById?: unknown;
      totalProfit?: unknown;
      legacySales?: unknown;
      sales?: unknown;
    };
    if (record.sales !== undefined && record.stockById === undefined) {
      return migrateV2ToV3(record);
    }
    const legacySales = coerceSales(record.legacySales);
    return {
      askById: coerceAskMap(record.askById),
      stockById: coerceStockMap(record.stockById),
      totalProfit:
        typeof record.totalProfit === "number" && Number.isFinite(record.totalProfit)
          ? Math.max(0, Math.round(record.totalProfit))
          : 0,
      legacySales: Object.keys(legacySales).length > 0 ? legacySales : undefined,
    };
  } catch {
    return emptyLot();
  }
}

export function saveLot(lot: LotState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lot));
  } catch {
    // ignore quota / private mode
  }
}

export function setAskPrice(lot: LotState, id: string, ask: number): LotState {
  const rounded = Math.max(1, Math.round(ask));
  return {
    ...lot,
    askById: { ...lot.askById, [id]: rounded },
  };
}

export function setVehicleStock(lot: LotState, vehicleId: string, quantity: number): LotState {
  const stock = Math.max(0, Math.min(MAX_VEHICLE_STOCK, Math.round(quantity)));
  return {
    ...lot,
    stockById: { ...lot.stockById, [vehicleId]: stock },
  };
}

export function sellVehicle(
  lot: LotState,
  vehicle: Pick<CatalogVehicle, "id" | "price">,
  _saleLogId?: string,
): LotState {
  const stock = stockForVehicle(lot, vehicle.id);
  if (stock <= 0) return lot;
  const ask = resolveAsk(lot, vehicle);
  const cost = acquisitionCost(ask);
  return {
    ...lot,
    stockById: { ...lot.stockById, [vehicle.id]: stock - 1 },
    totalProfit: lot.totalProfit + saleProfit(ask, cost),
  };
}

export function restockVehicle(
  lot: LotState,
  vehicleId: string,
  sale: Pick<SaleRecord, "ask" | "cost">,
): LotState {
  const stock = stockForVehicle(lot, vehicleId);
  if (stock >= MAX_VEHICLE_STOCK) return lot;
  return {
    ...lot,
    stockById: { ...lot.stockById, [vehicleId]: Math.min(MAX_VEHICLE_STOCK, stock + 1) },
    totalProfit: Math.max(0, lot.totalProfit - saleProfit(sale.ask, sale.cost)),
  };
}

export function clearLegacySales(lot: LotState): LotState {
  if (!lot.legacySales) return lot;
  const { legacySales: _removed, ...rest } = lot;
  return rest;
}

export function readCatalog(data: unknown): {
  vehicles: CatalogVehicle[];
  images: Record<string, string>;
} | null {
  if (!data || typeof data !== "object") return null;
  const message = data as {
    source?: unknown;
    type?: unknown;
    vehicles?: unknown;
    images?: unknown;
  };
  if (message.source !== "hillrush-catalog" || message.type !== "catalog") return null;
  if (!Array.isArray(message.vehicles) || !message.images || typeof message.images !== "object") {
    return null;
  }

  const vehicles: CatalogVehicle[] = [];
  for (const item of message.vehicles) {
    if (!item || typeof item !== "object") continue;
    const vehicle = item as Record<string, unknown>;
    if (typeof vehicle.id !== "string" || typeof vehicle.name !== "string") continue;
    const color =
      typeof vehicle.color === "string" && /^#[0-9a-fA-F]{6}$/.test(vehicle.color)
        ? vehicle.color
        : "#888888";
    vehicles.push({
      id: vehicle.id,
      name: vehicle.name,
      price: typeof vehicle.price === "number" && Number.isFinite(vehicle.price) ? vehicle.price : 0,
      desc: typeof vehicle.desc === "string" ? vehicle.desc : "",
      bike: vehicle.bike === true,
      color,
    });
  }

  const images: Record<string, string> = {};
  for (const [id, url] of Object.entries(message.images as Record<string, unknown>)) {
    if (typeof url === "string" && url.startsWith("data:image/")) images[id] = url;
  }

  if (vehicles.length === 0) return null;
  return { vehicles, images };
}
