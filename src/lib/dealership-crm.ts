import {
  type CatalogVehicle,
  type LotState,
  acquisitionCost,
  formatDollars,
  resolveAsk,
  restockVehicle,
  saleProfit,
  sellVehicle,
  stockForVehicle,
} from "@/lib/dealership";

export type CustomerSnapshot = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  age: number | null;
};

export type Customer = CustomerSnapshot & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type SaleLogStatus = "completed" | "restocked";

export type PaymentMethod = "upfront" | "financing";

export type SaleFinancing = {
  downPayment: number;
  termMonths: number;
  monthlyPayment: number;
  installmentsPaid: boolean[];
};

export type SaleLogEntry = {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicleName: string;
  ask: number;
  cost: number;
  profit: number;
  soldAt: string;
  status: SaleLogStatus;
  customerSnapshot: CustomerSnapshot;
  paymentMethod: PaymentMethod;
  financing?: SaleFinancing;
};

export type SalePaymentInput =
  | { method: "upfront" }
  | { method: "financing"; downPayment: number; termMonths: number };

export type SalePaymentFieldErrors = Partial<
  Record<"downPayment" | "termMonths" | "method", string>
>;

export const FINANCING_TERMS = [12, 24, 36] as const;
export type FinancingTerm = (typeof FINANCING_TERMS)[number];

export type CrmState = {
  customers: Customer[];
  sales: SaleLogEntry[];
};

export type CustomerInput = CustomerSnapshot;

export type CustomerFieldErrors = Partial<Record<keyof CustomerSnapshot, string>>;

const CRM_STORAGE_KEY = "rush-motors-crm-v1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyCrm(): CrmState {
  return { customers: [], sales: [] };
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `crm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeInput(input: CustomerInput): CustomerSnapshot {
  const ageRaw = input.age;
  let age: number | null = null;
  if (ageRaw !== null && typeof ageRaw === "number" && Number.isFinite(ageRaw)) {
    age = Math.round(ageRaw);
  }
  return {
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    age,
  };
}

export function validateCustomerInput(input: CustomerInput): CustomerFieldErrors {
  const errors: CustomerFieldErrors = {};
  const snapshot = normalizeInput(input);

  if (!snapshot.name) errors.name = "Name is required.";
  if (!snapshot.email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(snapshot.email)) errors.email = "Enter a valid email.";
  if (!snapshot.phone) errors.phone = "Phone is required.";
  else if (phoneDigits(snapshot.phone).length < 7) errors.phone = "Enter a valid phone number.";

  if (snapshot.age !== null && (snapshot.age < 16 || snapshot.age > 120)) {
    errors.age = "Age must be between 16 and 120.";
  }

  return errors;
}

export function computeFinancing(
  ask: number,
  downPayment: number,
  termMonths: number,
): SaleFinancing {
  const askRounded = Math.round(ask);
  const down = Math.round(Math.max(0, downPayment));
  const term = Math.round(termMonths);
  const remaining = Math.max(0, askRounded - down);
  const monthlyPayment = term > 0 ? Math.ceil(remaining / term) : 0;
  return {
    downPayment: down,
    termMonths: term,
    monthlyPayment,
    installmentsPaid: Array.from({ length: term }, () => false),
  };
}

export function validateSalePayment(
  ask: number,
  input: SalePaymentInput,
): SalePaymentFieldErrors {
  const errors: SalePaymentFieldErrors = {};
  const askRounded = Math.round(ask);
  if (input.method === "upfront") return errors;

  const down = Math.round(input.downPayment);
  if (!Number.isFinite(input.downPayment) || down < 0) {
    errors.downPayment = "Down payment must be zero or more.";
  } else if (down >= askRounded) {
    errors.downPayment = "Down payment must be less than the sale price.";
  }

  if (!FINANCING_TERMS.includes(input.termMonths as FinancingTerm)) {
    errors.termMonths = "Choose 12, 24, or 36 months.";
  }

  return errors;
}

export function financingPaidCount(financing: SaleFinancing): number {
  return financing.installmentsPaid.filter(Boolean).length;
}

export function financingIsComplete(financing: SaleFinancing): boolean {
  return financing.installmentsPaid.length > 0 && financingPaidCount(financing) >= financing.termMonths;
}

export function saleCanMarkPayment(entry: SaleLogEntry): boolean {
  return (
    entry.paymentMethod === "financing" &&
    entry.financing !== undefined &&
    entry.status === "completed" &&
    !financingIsComplete(entry.financing)
  );
}

export function formatPaymentPlan(entry: SaleLogEntry): string {
  if (entry.paymentMethod !== "financing" || !entry.financing) {
    return "Paid up front";
  }
  const f = entry.financing;
  const paid = financingPaidCount(f);
  const down =
    f.downPayment > 0 ? `${formatDollars(f.downPayment)} down · ` : "";
  return `${down}${formatDollars(f.monthlyPayment)}/mo · ${paid}/${f.termMonths} paid`;
}

function coerceFinancing(raw: unknown, ask: number): SaleFinancing | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const termMonths =
    typeof row.termMonths === "number" ? Math.round(row.termMonths) : 0;
  if (!FINANCING_TERMS.includes(termMonths as FinancingTerm)) return null;
  const downPayment =
    typeof row.downPayment === "number" ? Math.round(row.downPayment) : 0;
  const monthlyPayment =
    typeof row.monthlyPayment === "number" ? Math.round(row.monthlyPayment) : 0;
  if (downPayment < 0 || downPayment >= ask) return null;

  let installmentsPaid: boolean[] = [];
  if (Array.isArray(row.installmentsPaid)) {
    installmentsPaid = row.installmentsPaid.map((v) => v === true);
    if (installmentsPaid.length !== termMonths) {
      installmentsPaid = Array.from({ length: termMonths }, (_, i) => installmentsPaid[i] === true);
    }
  } else {
    installmentsPaid = Array.from({ length: termMonths }, () => false);
  }

  return { downPayment, termMonths, monthlyPayment, installmentsPaid };
}

export function loadCrm(): CrmState {
  if (typeof window === "undefined") return emptyCrm();
  try {
    const raw = window.localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) return emptyCrm();
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return emptyCrm();
    const record = data as { customers?: unknown; sales?: unknown };
    return {
      customers: coerceCustomers(record.customers),
      sales: coerceSales(record.sales),
    };
  } catch {
    return emptyCrm();
  }
}

export function saveCrm(state: CrmState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function coerceCustomers(raw: unknown): Customer[] {
  if (!Array.isArray(raw)) return [];
  const out: Customer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") continue;
    const snap = coerceSnapshot(row);
    if (!snap) continue;
    out.push({
      ...snap,
      id: row.id,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : nowIso(),
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : nowIso(),
    });
  }
  return out;
}

function coerceSnapshot(row: Record<string, unknown>): CustomerSnapshot | null {
  if (typeof row.name !== "string") return null;
  return {
    name: row.name,
    email: typeof row.email === "string" ? row.email : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    address: typeof row.address === "string" ? row.address : "",
    notes: typeof row.notes === "string" ? row.notes : "",
    age:
      typeof row.age === "number" && Number.isFinite(row.age) ? Math.round(row.age) : null,
  };
}

function coerceSales(raw: unknown): SaleLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SaleLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") continue;
    if (typeof row.customerId !== "string") continue;
    if (typeof row.vehicleId !== "string") continue;
    if (typeof row.vehicleName !== "string") continue;
    const snap = row.customerSnapshot;
    if (!snap || typeof snap !== "object") continue;
    const customerSnapshot = coerceSnapshot(snap as Record<string, unknown>);
    if (!customerSnapshot) continue;
    const ask = typeof row.ask === "number" ? Math.round(row.ask) : 0;
    const cost = typeof row.cost === "number" ? Math.round(row.cost) : 0;
    const profit = typeof row.profit === "number" ? Math.round(row.profit) : saleProfit(ask, cost);
    const status: SaleLogStatus = row.status === "restocked" ? "restocked" : "completed";
    let paymentMethod: PaymentMethod =
      row.paymentMethod === "financing" ? "financing" : "upfront";
    let financing: SaleFinancing | undefined;
    if (paymentMethod === "financing") {
      const coerced = coerceFinancing(row.financing, ask);
      if (coerced) financing = coerced;
      else paymentMethod = "upfront";
    }
    out.push({
      id: row.id,
      customerId: row.customerId,
      vehicleId: row.vehicleId,
      vehicleName: row.vehicleName,
      ask,
      cost,
      profit,
      soldAt: typeof row.soldAt === "string" ? row.soldAt : nowIso(),
      status,
      customerSnapshot,
      paymentMethod,
      financing,
    });
  }
  return out;
}

function findCustomerIndex(state: CrmState, snapshot: CustomerSnapshot): number {
  if (snapshot.email) {
    const idx = state.customers.findIndex((c) => normalizeEmail(c.email) === snapshot.email);
    if (idx >= 0) return idx;
  }
  const digits = phoneDigits(snapshot.phone);
  if (digits.length >= 7) {
    const idx = state.customers.findIndex((c) => phoneDigits(c.phone) === digits);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function upsertCustomer(
  state: CrmState,
  input: CustomerInput,
): { state: CrmState; customer: Customer } {
  const snapshot = normalizeInput(input);
  const ts = nowIso();
  const idx = findCustomerIndex(state, snapshot);

  if (idx >= 0) {
    const existing = state.customers[idx];
    const customer: Customer = {
      ...existing,
      ...snapshot,
      updatedAt: ts,
    };
    const customers = [...state.customers];
    customers[idx] = customer;
    return { state: { ...state, customers }, customer };
  }

  const customer: Customer = {
    ...snapshot,
    id: newId(),
    createdAt: ts,
    updatedAt: ts,
  };
  return {
    state: { ...state, customers: [...state.customers, customer] },
    customer,
  };
}

export function recordSale(
  state: CrmState,
  opts: {
    customer: Customer;
    vehicle: Pick<CatalogVehicle, "id" | "name">;
    ask: number;
    cost: number;
    saleLogId?: string;
    payment?: SalePaymentInput;
  },
): { state: CrmState; entry: SaleLogEntry } {
  const ask = Math.round(opts.ask);
  const cost = Math.round(opts.cost);
  const payment: SalePaymentInput = opts.payment ?? { method: "upfront" };
  let paymentMethod: PaymentMethod = "upfront";
  let financing: SaleFinancing | undefined;
  if (payment.method === "financing") {
    paymentMethod = "financing";
    financing = computeFinancing(ask, payment.downPayment, payment.termMonths);
  }
  const entry: SaleLogEntry = {
    id: opts.saleLogId ?? newId(),
    customerId: opts.customer.id,
    vehicleId: opts.vehicle.id,
    vehicleName: opts.vehicle.name,
    ask,
    cost,
    profit: saleProfit(ask, cost),
    soldAt: nowIso(),
    status: "completed",
    customerSnapshot: {
      name: opts.customer.name,
      email: opts.customer.email,
      phone: opts.customer.phone,
      address: opts.customer.address,
      notes: opts.customer.notes,
      age: opts.customer.age,
    },
    paymentMethod,
    financing,
  };
  return {
    state: { ...state, sales: [...state.sales, entry] },
    entry,
  };
}

export function markSaleRestocked(state: CrmState, saleLogId: string): CrmState {
  const sales = state.sales.map((entry) =>
    entry.id === saleLogId ? { ...entry, status: "restocked" as const } : entry,
  );
  return { ...state, sales };
}

export type CompleteSaleResult =
  | { ok: true; lot: LotState; crm: CrmState; entry: SaleLogEntry; customer: Customer }
  | { ok: false; code: "already_sold" | "validation"; errors?: CustomerFieldErrors }
  | { ok: false; code: "payment_validation"; errors?: SalePaymentFieldErrors }
  | { ok: false; code: "save_failed" };

export function completeSale(
  lot: LotState,
  crm: CrmState,
  vehicle: CatalogVehicle,
  input: CustomerInput,
  payment: SalePaymentInput = { method: "upfront" },
): CompleteSaleResult {
  if (stockForVehicle(lot, vehicle.id) <= 0) {
    return { ok: false, code: "already_sold" };
  }

  const errors = validateCustomerInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: "validation", errors };
  }

  const ask = resolveAsk(lot, vehicle);
  const paymentErrors = validateSalePayment(ask, payment);
  if (Object.keys(paymentErrors).length > 0) {
    return { ok: false, code: "payment_validation", errors: paymentErrors };
  }

  const saleLogId = newId();
  let nextCrm = crm;
  const upserted = upsertCustomer(nextCrm, input);
  nextCrm = upserted.state;
  const cost = acquisitionCost(ask);
  const recorded = recordSale(nextCrm, {
    customer: upserted.customer,
    vehicle,
    ask,
    cost,
    saleLogId,
    payment,
  });
  nextCrm = recorded.state;

  if (!saveCrm(nextCrm)) {
    return { ok: false, code: "save_failed" };
  }

  const nextLot = sellVehicle(lot, vehicle, saleLogId);
  return {
    ok: true,
    lot: nextLot,
    crm: nextCrm,
    entry: recorded.entry,
    customer: upserted.customer,
  };
}

export function saleLogForVehicle(crm: CrmState, vehicleId: string): SaleLogEntry | undefined {
  const matches = crm.sales.filter((s) => s.vehicleId === vehicleId);
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => b.soldAt.localeCompare(a.soldAt))[0];
}

export function customerSaleCount(crm: CrmState, customerId: string): number {
  return crm.sales.filter((s) => s.customerId === customerId).length;
}

export function customerLastSaleAt(crm: CrmState, customerId: string): string | null {
  const sales = crm.sales.filter((s) => s.customerId === customerId);
  if (sales.length === 0) return null;
  return sales.sort((a, b) => b.soldAt.localeCompare(a.soldAt))[0].soldAt;
}

export function salesLogSorted(crm: CrmState): SaleLogEntry[] {
  return [...crm.sales].sort((a, b) => b.soldAt.localeCompare(a.soldAt));
}

export type CompletedSalesTotals = {
  count: number;
  revenue: number;
  expenses: number;
  profit: number;
};

export function completedSalesTotals(crm: CrmState): CompletedSalesTotals {
  const completed = crm.sales.filter((s) => s.status === "completed");
  return completed.reduce(
    (acc, entry) => ({
      count: acc.count + 1,
      revenue: acc.revenue + Math.round(entry.ask),
      expenses: acc.expenses + Math.round(entry.cost),
      profit: acc.profit + Math.round(entry.profit),
    }),
    { count: 0, revenue: 0, expenses: 0, profit: 0 },
  );
}

/** Backfill CRM log rows for lot sales that have no matching log entry. */
export function backfillLegacySales(
  lot: LotState,
  crm: CrmState,
  vehicleNames: Record<string, string> = {},
): { crm: CrmState; changed: boolean } {
  let next = crm;
  let changed = false;
  let legacyCustomer: Customer | null =
    next.customers.find((c) => c.email === "legacy@rushmotors.local") ?? null;

  const legacySales = lot.legacySales ?? {};
  for (const [vehicleId, sale] of Object.entries(legacySales)) {
    const saleLogId = sale.saleLogId;
    if (next.sales.some((e) => e.id === saleLogId)) continue;

    if (!legacyCustomer) {
      const upserted = upsertCustomer(next, {
        name: "Legacy buyer",
        email: "legacy@rushmotors.local",
        phone: "000-000-0000",
        address: "",
        notes: "Auto-created for sales before CRM",
        age: null,
      });
      next = upserted.state;
      legacyCustomer = upserted.customer;
    }

    const recorded = recordSale(next, {
      customer: legacyCustomer,
      vehicle: { id: vehicleId, name: vehicleNames[vehicleId] ?? vehicleId },
      ask: sale.ask,
      cost: sale.cost,
      saleLogId,
    });
    next = recorded.state;
    changed = true;
  }

  return { crm: next, changed };
}

export function latestCompletedSale(
  crm: CrmState,
  vehicleId: string,
): SaleLogEntry | undefined {
  const matches = crm.sales.filter(
    (s) => s.vehicleId === vehicleId && s.status === "completed",
  );
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => b.soldAt.localeCompare(a.soldAt))[0];
}

export function completeRestock(
  lot: LotState,
  crm: CrmState,
  vehicleId: string,
): { lot: LotState; crm: CrmState } | null {
  const entry = latestCompletedSale(crm, vehicleId);
  if (!entry) return null;
  const nextCrm = markSaleRestocked(crm, entry.id);
  if (!saveCrm(nextCrm)) return null;
  return {
    lot: restockVehicle(lot, vehicleId, { ask: entry.ask, cost: entry.cost }),
    crm: nextCrm,
  };
}

export function formatSaleDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function updateSaleEntry(
  state: CrmState,
  saleLogId: string,
  updater: (entry: SaleLogEntry) => SaleLogEntry | null,
): CrmState | null {
  const idx = state.sales.findIndex((e) => e.id === saleLogId);
  if (idx < 0) return null;
  const entry = state.sales[idx];
  const nextEntry = updater(entry);
  if (!nextEntry) return null;
  const sales = [...state.sales];
  sales[idx] = nextEntry;
  return { ...state, sales };
}

export function markNextInstallmentPaid(crm: CrmState, saleLogId: string): CrmState | null {
  const next = updateSaleEntry(crm, saleLogId, (entry) => {
    if (!saleCanMarkPayment(entry) || !entry.financing) return null;
    const installmentsPaid = [...entry.financing.installmentsPaid];
    const openIdx = installmentsPaid.findIndex((p) => !p);
    if (openIdx < 0) return null;
    installmentsPaid[openIdx] = true;
    return {
      ...entry,
      financing: { ...entry.financing, installmentsPaid },
    };
  });
  if (!next || !saveCrm(next)) return null;
  return next;
}

export function setInstallmentPaid(
  crm: CrmState,
  saleLogId: string,
  index: number,
  paid: boolean,
): CrmState | null {
  const next = updateSaleEntry(crm, saleLogId, (entry) => {
    if (entry.paymentMethod !== "financing" || !entry.financing || entry.status !== "completed") {
      return null;
    }
    if (index < 0 || index >= entry.financing.installmentsPaid.length) return null;
    const installmentsPaid = [...entry.financing.installmentsPaid];
    installmentsPaid[index] = paid;
    return {
      ...entry,
      financing: { ...entry.financing, installmentsPaid },
    };
  });
  if (!next || !saveCrm(next)) return null;
  return next;
}
