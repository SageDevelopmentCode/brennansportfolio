"use client";

import { FinancingTracker } from "@/components/dealership-financing-tracker";
import { SaleLogDetailSidebar } from "@/components/sale-log-detail-sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type CatalogVehicle,
  type LotFilter,
  type LotState,
  LOT_FILTERS,
  acquisitionCost,
  emptyLot,
  formatDollars,
  formatMileage,
  clearLegacySales,
  loadLot,
  lotCategory,
  MAX_VEHICLE_STOCK,
  readCatalog,
  resolveAsk,
  saleProfit,
  saveLot,
  setAskPrice,
  setVehicleStock,
  stockForVehicle,
  vehicleSpecs,
} from "@/lib/dealership";
import {
  type CrmState,
  type Customer,
  type CustomerFieldErrors,
  type CustomerInput,
  type FinancingTerm,
  type PaymentMethod,
  type SaleLogEntry,
  type SalePaymentFieldErrors,
  FINANCING_TERMS,
  backfillLegacySales,
  completeRestock,
  completeSale,
  completedSalesTotals,
  latestCompletedSale,
  computeFinancing,
  customerLastSaleAt,
  customerSaleCount,
  emptyCrm,
  formatPaymentPlan,
  formatSaleDate,
  loadCrm,
  markNextInstallmentPaid,
  salesLogSorted,
  saleCanMarkPayment,
  saveCrm,
  saleLogForVehicle,
} from "@/lib/dealership-crm";
import {
  type Employee,
  type EmployeeFieldErrors,
  type EmployeeInput,
  type StaffState,
  addEmployee,
  assignEmployeeToVehicle,
  employeeForVehicle,
  emptyStaff,
  loadStaff,
  removeEmployee,
  saveStaff,
  vehiclesForEmployee,
} from "@/lib/dealership-staff";

const CATALOG_SRC = "/hillrush/index.html?mode=catalog";

type MainTab = "inventory" | "customers" | "sales" | "employees";
type SellStep = "detail" | "buyer";

const EMPTY_BUYER: CustomerInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  age: null,
};

const EMPTY_EMPLOYEE: EmployeeInput = {
  name: "",
  role: "",
};

const DEFAULT_TERM_MONTHS: FinancingTerm = 12;

function resetSalePaymentState(): {
  paymentMethod: PaymentMethod;
  downPaymentDraft: string;
  termMonths: FinancingTerm;
  paymentErrors: SalePaymentFieldErrors;
} {
  return {
    paymentMethod: "upfront",
    downPaymentDraft: "",
    termMonths: DEFAULT_TERM_MONTHS,
    paymentErrors: {},
  };
}

export function DealershipClient() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameSrc, setFrameSrc] = useState("");
  const [vehicles, setVehicles] = useState<CatalogVehicle[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lot, setLot] = useState<LotState>(emptyLot);
  const [crm, setCrm] = useState<CrmState>(emptyCrm);
  const [staff, setStaff] = useState<StaffState>(emptyStaff);
  const [hydrated, setHydrated] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("inventory");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LotFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sellStep, setSellStep] = useState<SellStep>("detail");
  const [resetArmed, setResetArmed] = useState(false);
  const [askDraft, setAskDraft] = useState("");
  const [stockDraft, setStockDraft] = useState("");
  const [buyer, setBuyer] = useState<CustomerInput>(EMPTY_BUYER);
  const [buyerErrors, setBuyerErrors] = useState<CustomerFieldErrors>({});
  const [saleError, setSaleError] = useState<string | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState<EmployeeInput>(EMPTY_EMPLOYEE);
  const [employeeErrors, setEmployeeErrors] = useState<EmployeeFieldErrors>({});
  const [removeEmployeeId, setRemoveEmployeeId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upfront");
  const [downPaymentDraft, setDownPaymentDraft] = useState("");
  const [termMonths, setTermMonths] = useState<FinancingTerm>(DEFAULT_TERM_MONTHS);
  const [paymentErrors, setPaymentErrors] = useState<SalePaymentFieldErrors>({});
  const [saleDetailId, setSaleDetailId] = useState<string | null>(null);

  useEffect(() => {
    const loadedLot = loadLot();
    let loadedCrm = loadCrm();
    const backfill = backfillLegacySales(loadedLot, loadedCrm);
    loadedCrm = backfill.crm;
    if (backfill.changed) saveCrm(loadedCrm);
    let lotToUse = loadedLot;
    if (loadedLot.legacySales) {
      lotToUse = clearLegacySales(loadedLot);
      saveLot(lotToUse);
    }
    setLot(lotToUse);
    setCrm(loadedCrm);
    setStaff(loadStaff());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLot(lot);
  }, [hydrated, lot]);

  useEffect(() => {
    if (!hydrated) return;
    saveStaff(staff);
  }, [hydrated, staff]);

  useEffect(() => {
    if (!hydrated || !ready || vehicles.length === 0) return;
    const names = Object.fromEntries(vehicles.map((v) => [v.id, v.name]));
    setCrm((prev) => {
      const backfill = backfillLegacySales(lot, prev, names);
      if (backfill.changed) saveCrm(backfill.crm);
      return backfill.crm;
    });
  }, [hydrated, ready, vehicles, lot]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const catalog = readCatalog(event.data);
      if (!catalog) return;
      setVehicles(catalog.vehicles);
      setImages(catalog.images);
      setReady(true);
      setFailed(false);
    }
    window.addEventListener("message", onMessage);
    setFrameSrc(CATALOG_SRC);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!resetArmed) return;
    const timer = window.setTimeout(() => setResetArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [resetArmed]);

  useEffect(() => {
    if (!removeEmployeeId) return;
    const timer = window.setTimeout(() => setRemoveEmployeeId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [removeEmployeeId]);

  useEffect(() => {
    if (!selectedId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? null;
  const selectedAsk = selected ? resolveAsk(lot, selected) : 0;
  const selectedCost = selected ? acquisitionCost(selectedAsk) : 0;
  const selectedProfit = selected ? saleProfit(selectedAsk, selectedCost) : 0;
  const selectedSpecs = selected ? vehicleSpecs(selected.id, selected.color) : null;
  const selectedStock = selected ? stockForVehicle(lot, selected.id) : 0;
  const selectedOutOfStock = selected ? selectedStock <= 0 : false;
  const activeSaleLog = selected ? findActiveSaleLog(crm, lot, selected.id) : null;

  useEffect(() => {
    if (!selected) {
      setAskDraft("");
      setStockDraft("");
      return;
    }
    setAskDraft(String(resolveAsk(lot, selected)));
    setStockDraft(String(stockForVehicle(lot, selected.id)));
  }, [selected, lot]);

  function closeModal() {
    setSelectedId(null);
    setSellStep("detail");
    setBuyer(EMPTY_BUYER);
    setBuyerErrors({});
    setSaleError(null);
    const paymentReset = resetSalePaymentState();
    setPaymentMethod(paymentReset.paymentMethod);
    setDownPaymentDraft(paymentReset.downPaymentDraft);
    setTermMonths(paymentReset.termMonths);
    setPaymentErrors(paymentReset.paymentErrors);
  }

  function beginSellFlow() {
    setSellStep("buyer");
    setBuyer(EMPTY_BUYER);
    setBuyerErrors({});
    setSaleError(null);
    const paymentReset = resetSalePaymentState();
    setPaymentMethod(paymentReset.paymentMethod);
    setDownPaymentDraft(paymentReset.downPaymentDraft);
    setTermMonths(paymentReset.termMonths);
    setPaymentErrors(paymentReset.paymentErrors);
  }

  function handleMarkPayment(saleLogId: string) {
    const next = markNextInstallmentPaid(crm, saleLogId);
    if (next) updateCrm(next);
  }

  const financingPreview = useMemo(() => {
    if (paymentMethod !== "financing" || !selected) return null;
    const parsed = Number(downPaymentDraft.replace(/,/g, ""));
    const down = Number.isFinite(parsed) ? Math.round(parsed) : 0;
    return computeFinancing(selectedAsk, down, termMonths);
  }, [paymentMethod, downPaymentDraft, termMonths, selectedAsk, selected]);

  function requestCatalog() {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "rush-motors", type: "catalog-request" },
      window.location.origin,
    );
  }

  function retryCatalog() {
    setReady(false);
    setFailed(false);
    setFrameSrc(`${CATALOG_SRC}&reload=${Date.now()}`);
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (filter !== "all" && lotCategory(vehicle) !== filter) return false;
      if (!needle) return true;
      const specs = vehicleSpecs(vehicle.id, vehicle.color);
      return (
        vehicle.name.toLowerCase().includes(needle) ||
        specs.vin.toLowerCase().includes(needle)
      );
    });
  }, [vehicles, filter, query]);

  const sortedCustomers = useMemo(() => {
    return [...crm.customers].sort((a, b) => a.name.localeCompare(b.name));
  }, [crm.customers]);

  const salesLog = useMemo(() => salesLogSorted(crm), [crm.sales]);

  const closedSalesTotals = useMemo(() => completedSalesTotals(crm), [crm.sales]);

  const saleDetailEntry = useMemo(
    () => (saleDetailId ? (crm.sales.find((s) => s.id === saleDetailId) ?? null) : null),
    [crm.sales, saleDetailId],
  );

  const saleDetailVehicle = useMemo(
    () =>
      saleDetailEntry
        ? (vehicles.find((v) => v.id === saleDetailEntry.vehicleId) ?? null)
        : null,
    [vehicles, saleDetailEntry],
  );

  const saleDetailEmployee = useMemo(
    () =>
      saleDetailEntry ? employeeForVehicle(staff, saleDetailEntry.vehicleId) : null,
    [staff, saleDetailEntry],
  );

  const forSaleCount = useMemo(
    () => vehicles.reduce((sum, v) => sum + stockForVehicle(lot, v.id), 0),
    [vehicles, lot],
  );
  const soldCount = useMemo(
    () =>
      crm.sales.filter((s) => s.status === "completed").length,
    [crm.sales],
  );

  function updateLot(next: LotState) {
    setLot(next);
    setResetArmed(false);
  }

  function updateCrm(next: CrmState) {
    setCrm(next);
  }

  function updateStaff(next: StaffState) {
    setStaff(next);
  }

  function handleAddEmployee(event: React.FormEvent) {
    event.preventDefault();
    const result = addEmployee(staff, newEmployee);
    if (!result.ok) {
      setEmployeeErrors(result.errors);
      return;
    }
    setEmployeeErrors({});
    setNewEmployee(EMPTY_EMPLOYEE);
    updateStaff(result.state);
  }

  function handleRemoveEmployee(employeeId: string) {
    if (removeEmployeeId !== employeeId) {
      setRemoveEmployeeId(employeeId);
      return;
    }
    updateStaff(removeEmployee(staff, employeeId));
    setRemoveEmployeeId(null);
  }

  function handleAssignVehicle(vehicleId: string, employeeId: string) {
    updateStaff(
      assignEmployeeToVehicle(staff, vehicleId, employeeId === "" ? null : employeeId),
    );
  }

  const vehicleNameById = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v.name])),
    [vehicles],
  );

  const sortedEmployees = useMemo(
    () => [...staff.employees].sort((a, b) => a.name.localeCompare(b.name)),
    [staff.employees],
  );

  function commitAskDraft() {
    if (!selected) return;
    const parsed = Number(askDraft.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed < 1) {
      setAskDraft(String(resolveAsk(lot, selected)));
      return;
    }
    updateLot(setAskPrice(lot, selected.id, parsed));
  }

  function commitStockDraft() {
    if (!selected) return;
    const parsed = Number(stockDraft.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setStockDraft(String(stockForVehicle(lot, selected.id)));
      return;
    }
    updateLot(setVehicleStock(lot, selected.id, parsed));
  }

  function adjustStock(delta: number) {
    if (!selected) return;
    const next = Math.max(0, Math.min(MAX_VEHICLE_STOCK, stockForVehicle(lot, selected.id) + delta));
    setStockDraft(String(next));
    updateLot(setVehicleStock(lot, selected.id, next));
  }

  function handleRestock() {
    if (!selected) return;
    const result = completeRestock(lot, crm, selected.id);
    if (!result) return;
    updateLot(result.lot);
    updateCrm(result.crm);
  }

  function handleCompleteSale() {
    if (!selected) return;
    setSaleError(null);
    setPaymentErrors({});
    const ageText = String(buyer.age ?? "").trim();
    const parsedAge = ageText === "" ? null : Number(ageText);
    const input: CustomerInput = {
      ...buyer,
      age:
        parsedAge !== null && Number.isFinite(parsedAge) ? Math.round(parsedAge) : null,
    };
    const downParsed = Number(downPaymentDraft.replace(/,/g, ""));
    const downPayment =
      paymentMethod === "financing" && Number.isFinite(downParsed) ? Math.round(downParsed) : 0;
    const payment =
      paymentMethod === "financing"
        ? { method: "financing" as const, downPayment, termMonths }
        : { method: "upfront" as const };
    const result = completeSale(lot, crm, selected, input, payment);
    if (!result.ok) {
      if (result.code === "validation" && result.errors) {
        setBuyerErrors(result.errors);
        return;
      }
      if (result.code === "payment_validation" && result.errors) {
        setPaymentErrors(result.errors);
        return;
      }
      if (result.code === "save_failed") {
        setSaleError("Could not save customer info. Try again.");
        return;
      }
      setSaleError("None left in stock for this model.");
      return;
    }
    updateLot(result.lot);
    updateCrm(result.crm);
    setSellStep("detail");
    setBuyerErrors({});
    setBuyer(EMPTY_BUYER);
    const paymentReset = resetSalePaymentState();
    setPaymentMethod(paymentReset.paymentMethod);
    setDownPaymentDraft(paymentReset.downPaymentDraft);
    setTermMonths(paymentReset.termMonths);
    setPaymentErrors(paymentReset.paymentErrors);
  }

  return (
    <div className="flex flex-col gap-6">
      {frameSrc ? (
        <iframe
          ref={iframeRef}
          src={frameSrc}
          title="Hill Rush car catalog"
          className="dealership-catalog-frame"
          aria-hidden
          tabIndex={-1}
          onLoad={requestCatalog}
        />
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dealership sections">
        <TabChip active={mainTab === "inventory"} onClick={() => setMainTab("inventory")}>
          Inventory
        </TabChip>
        <TabChip active={mainTab === "customers"} onClick={() => setMainTab("customers")}>
          Customers ({crm.customers.length})
        </TabChip>
        <TabChip active={mainTab === "sales"} onClick={() => setMainTab("sales")}>
          Sales log ({crm.sales.length})
        </TabChip>
        <TabChip active={mainTab === "employees"} onClick={() => setMainTab("employees")}>
          Employees ({staff.employees.length})
        </TabChip>
      </div>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Lot totals">
        <Stat label="Units on lot" value={ready ? String(forSaleCount) : "—"} />
        <Stat label="Sales closed" value={String(soldCount)} />
        <Stat label="Total profit" value={formatDollars(lot.totalProfit)} />
      </section>

      {mainTab === "inventory" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--lot-ink)]">
                Search the lot
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Jeep, rocket, tank…"
                  className="dealership-input"
                />
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
                {LOT_FILTERS.map((item) => {
                  const active = filter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(item.id)}
                      className={active ? "dealership-chip dealership-chip-on" : "dealership-chip"}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                className="dealership-btn-ghost"
                onClick={() => {
                  if (!resetArmed) {
                    setResetArmed(true);
                    return;
                  }
                  updateLot(emptyLot());
                }}
              >
                {resetArmed ? "Clear sales?" : "Reset lot"}
              </button>
              <p className="text-xs text-[var(--lot-muted)]">Reset clears the lot only. CRM data stays.</p>
            </div>
          </div>

          {!ready && !failed && (
            <p className="text-sm font-semibold text-[var(--lot-muted)]">Rolling the cars onto the lot…</p>
          )}

          {failed && !ready && (
            <div className="dealership-card flex flex-col items-start gap-3 p-5">
              <p className="font-semibold">The lot drawings didn&apos;t load.</p>
              <button type="button" className="dealership-btn-primary" onClick={retryCatalog}>
                Try again
              </button>
            </div>
          )}

          {ready && visible.length === 0 && (
            <p className="text-sm font-semibold text-[var(--lot-muted)]">No cars match that search.</p>
          )}

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((vehicle) => {
              const vehicleStock = stockForVehicle(lot, vehicle.id);
              const isVehicleSold = vehicleStock <= 0;
              const ask = resolveAsk(lot, vehicle);
              const assignee = employeeForVehicle(staff, vehicle.id);
              return (
                <li key={vehicle.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(vehicle.id);
                      setSellStep("detail");
                      setBuyer(EMPTY_BUYER);
                      setBuyerErrors({});
                      setSaleError(null);
                    }}
                    className={`dealership-card flex w-full flex-col overflow-hidden text-left ${isVehicleSold ? "opacity-80" : ""}`}
                  >
                    <span className="relative block bg-[var(--lot-sky)]">
                      {images[vehicle.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[vehicle.id]}
                          alt=""
                          className="h-40 w-full object-contain"
                        />
                      ) : (
                        <span className="block h-40" />
                      )}
                      {isVehicleSold ? (
                        <span className="dealership-sold-badge">Sold out</span>
                      ) : vehicleStock > 1 ? (
                        <span className="dealership-sold-badge bg-[var(--lot-accent)] text-white">
                          ×{vehicleStock}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex flex-col gap-1 p-4">
                      <span className="text-lg font-extrabold text-[var(--lot-ink)]">{vehicle.name}</span>
                      <span className="line-clamp-2 text-sm text-[var(--lot-muted)]">{vehicle.desc}</span>
                      <span className="mt-2 text-base font-bold text-[var(--lot-accent)]">
                        {formatDollars(ask)}
                      </span>
                      {!isVehicleSold ? (
                        <span className="text-xs font-semibold text-[var(--lot-muted)]">
                          {vehicleStock} in stock
                        </span>
                      ) : null}
                      {assignee ? (
                        <span className="text-xs font-semibold text-[var(--lot-muted)]">
                          {assignee.name}
                          {assignee.role ? ` · ${assignee.role}` : ""}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {mainTab === "employees" && (
        <section className="flex flex-col gap-4" aria-label="Employees">
          <p className="text-xs text-[var(--lot-muted)]">
            Reset lot clears sales only. Employee roster and car assignments stay saved here.
          </p>
          <form
            className="dealership-card flex flex-col gap-4 p-5"
            onSubmit={handleAddEmployee}
          >
            <h2 className="text-lg font-extrabold text-[var(--lot-ink)]">Add employee</h2>
            <div className="dealership-form-grid">
              <Field label="Name" required error={employeeErrors.name}>
                <input
                  type="text"
                  autoComplete="name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="dealership-input"
                />
              </Field>
              <Field label="Role" error={employeeErrors.role}>
                <input
                  type="text"
                  placeholder="Sales, lot tech…"
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="dealership-input"
                />
              </Field>
            </div>
            <button type="submit" className="dealership-btn-primary self-start">
              Add to roster
            </button>
          </form>
          {sortedEmployees.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--lot-muted)]">
              No employees yet. Add someone who can take a car on the lot.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sortedEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  vehicleIds={vehiclesForEmployee(staff, employee.id)}
                  vehicleNameById={vehicleNameById}
                  removeArmed={removeEmployeeId === employee.id}
                  onRemove={() => handleRemoveEmployee(employee.id)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {mainTab === "customers" && (
        <section className="flex flex-col gap-3" aria-label="Customers">
          {sortedCustomers.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--lot-muted)]">
              No customers yet. Complete a sale to add someone to the CRM.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sortedCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  crm={crm}
                  expanded={expandedCustomerId === customer.id}
                  onToggle={() =>
                    setExpandedCustomerId((id) => (id === customer.id ? null : customer.id))
                  }
                  onMarkPayment={handleMarkPayment}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {mainTab === "sales" && (
        <section className="flex flex-col gap-3" aria-label="Sales log">
          <div className="flex flex-col gap-3">
            <section
              className="grid gap-3 sm:grid-cols-3"
              aria-label="Closed sales summary"
            >
              <Stat label="Revenue" value={formatDollars(closedSalesTotals.revenue)} />
              <div className="dealership-card px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--lot-muted)]">
                  Expenses
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--lot-ink)]">
                  {formatDollars(closedSalesTotals.expenses)}
                </p>
                <p className="mt-1 text-xs text-[var(--lot-muted)]">
                  Vehicle acquisition costs (closed sales)
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--lot-muted)]">
                  {closedSalesTotals.count} closed sale{closedSalesTotals.count === 1 ? "" : "s"}
                </p>
              </div>
              <Stat label="Net profit" value={formatDollars(closedSalesTotals.profit)} />
            </section>
          </div>
          {salesLog.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--lot-muted)]">No sales logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {salesLog.map((entry) => (
                <SaleLogRow
                  key={entry.id}
                  entry={entry}
                  onMarkPayment={handleMarkPayment}
                  onOpen={() => setSaleDetailId(entry.id)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {saleDetailEntry ? (
        <SaleLogDetailSidebar
          entry={saleDetailEntry}
          vehicle={saleDetailVehicle}
          imageUrl={images[saleDetailEntry.vehicleId]}
          assignedEmployee={saleDetailEmployee}
          onMarkPayment={handleMarkPayment}
          onClose={() => setSaleDetailId(null)}
        />
      ) : null}

      {selected && selectedSpecs && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lot-car-title"
            className="dealership-card max-h-[90vh] w-full max-w-lg overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {sellStep === "buyer" ? (
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-2xl font-extrabold">Sell {selected.name}</h2>
                <p className="text-sm text-[var(--lot-muted)]">
                  Add the buyer to your CRM. Sale price {formatDollars(selectedAsk)} · profit{" "}
                  {formatDollars(selectedProfit)}.
                </p>
                <PaymentPlanForm
                  paymentMethod={paymentMethod}
                  downPaymentDraft={downPaymentDraft}
                  termMonths={termMonths}
                  errors={paymentErrors}
                  ask={selectedAsk}
                  preview={financingPreview}
                  onMethodChange={setPaymentMethod}
                  onDownPaymentChange={setDownPaymentDraft}
                  onTermChange={setTermMonths}
                />
                <BuyerForm
                  buyer={buyer}
                  errors={buyerErrors}
                  onChange={setBuyer}
                />
                {saleError ? (
                  <p className="text-sm font-semibold text-red-700" role="alert">
                    {saleError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="dealership-btn-primary" onClick={handleCompleteSale}>
                    Complete sale
                  </button>
                  <button
                    type="button"
                    className="dealership-btn-ghost"
                    onClick={() => {
                      setSellStep("detail");
                      setBuyerErrors({});
                      setSaleError(null);
                      setPaymentErrors({});
                    }}
                  >
                    Back
                  </button>
                  <button type="button" className="dealership-btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative bg-[var(--lot-sky)]">
                  {images[selected.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[selected.id]}
                      alt={`${selected.name} from Hill Rush`}
                      className="h-52 w-full object-contain"
                    />
                  ) : (
                    <div className="h-52" />
                  )}
                  {selectedOutOfStock ? (
                    <span className="dealership-sold-badge">Sold out</span>
                  ) : selectedStock > 1 ? (
                    <span className="dealership-sold-badge bg-[var(--lot-accent)] text-white">
                      ×{selectedStock}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-4 p-5">
                  <div>
                    <h2 id="lot-car-title" className="text-2xl font-extrabold">
                      {selected.name}
                    </h2>
                    <p className="mt-2 text-[var(--lot-muted)]">{selected.desc}</p>
                  </div>

                  <dl className="dealership-specs">
                    <SpecRow label="VIN" value={selectedSpecs.vin} mono />
                    <SpecRow label="Year" value={String(selectedSpecs.year)} />
                    <SpecRow
                      label="Color"
                      value={selectedSpecs.colorLabel}
                      swatch={selected.color}
                    />
                    <SpecRow label="Mileage" value={formatMileage(selectedSpecs.mileage)} />
                    <SpecRow label="Condition" value={selectedSpecs.condition} />
                  </dl>

                  <div className="rounded-xl border border-[var(--lot-border)] bg-white/70 p-4">
                    <p className="text-sm font-bold text-[var(--lot-ink)]">Quantity on lot</p>
                    <p className="mt-1 text-xs text-[var(--lot-muted)]">
                      How many of this model you have for sale (max {MAX_VEHICLE_STOCK}).
                    </p>
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <button
                        type="button"
                        className="dealership-btn-ghost"
                        aria-label="Decrease quantity"
                        onClick={() => adjustStock(-1)}
                        disabled={selectedStock <= 0}
                      >
                        −
                      </button>
                      <label className="flex min-w-[5rem] flex-1 flex-col gap-1 text-sm font-semibold text-[var(--lot-ink)]">
                        In stock
                        <input
                          type="text"
                          inputMode="numeric"
                          value={stockDraft}
                          onChange={(e) => setStockDraft(e.target.value)}
                          onBlur={commitStockDraft}
                          className="dealership-input"
                        />
                      </label>
                      <button
                        type="button"
                        className="dealership-btn-ghost"
                        aria-label="Increase quantity"
                        onClick={() => adjustStock(1)}
                        disabled={selectedStock >= MAX_VEHICLE_STOCK}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <Field label="Assigned employee">
                    <select
                      className="dealership-input"
                      value={staff.assignByVehicleId[selected.id] ?? ""}
                      onChange={(e) => handleAssignVehicle(selected.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {sortedEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                          {employee.role ? ` (${employee.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="dealership-money grid gap-3 rounded-xl border border-[var(--lot-border)] bg-white/70 p-4">
                    <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--lot-ink)]">
                      Asking price
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={selectedOutOfStock}
                        value={askDraft}
                        onChange={(event) => setAskDraft(event.target.value)}
                        onBlur={commitAskDraft}
                        className="dealership-input"
                      />
                    </label>
                    <p className="text-sm text-[var(--lot-muted)]">
                      Your cost{" "}
                      <span className="font-bold text-[var(--lot-ink)]">{formatDollars(selectedCost)}</span>
                      <span className="text-xs"> (70% of ask)</span>
                    </p>
                    <p className="text-base font-extrabold text-[var(--lot-accent)]">
                      Profit if sold: {formatDollars(selectedProfit)}
                    </p>
                    {activeSaleLog && selectedOutOfStock ? (
                      <>
                        <p className="text-sm text-[var(--lot-muted)]">
                          Last sale {formatDollars(activeSaleLog.ask)} · profit{" "}
                          {formatDollars(activeSaleLog.profit)}
                        </p>
                        <p className="text-sm font-semibold text-[var(--lot-ink)]">
                          Buyer: {activeSaleLog.customerSnapshot.name}
                          {activeSaleLog.customerSnapshot.email
                            ? ` · ${activeSaleLog.customerSnapshot.email}`
                            : ""}
                        </p>
                        <FinancingTracker
                          entry={activeSaleLog}
                          onMarkPayment={handleMarkPayment}
                        />
                      </>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedOutOfStock ? (
                      <button
                        type="button"
                        className="dealership-btn-primary"
                        onClick={handleRestock}
                        disabled={!latestCompletedSale(crm, selected.id)}
                      >
                        Put back on the lot
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dealership-btn-primary"
                        onClick={beginSellFlow}
                      >
                        Sell
                      </button>
                    )}
                    <button type="button" className="dealership-btn-ghost" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function findActiveSaleLog(
  crm: CrmState,
  lot: LotState,
  vehicleId: string,
): SaleLogEntry | null {
  if (stockForVehicle(lot, vehicleId) > 0) {
    return saleLogForVehicle(crm, vehicleId) ?? null;
  }
  return latestCompletedSale(crm, vehicleId) ?? null;
}

function PaymentPlanForm({
  paymentMethod,
  downPaymentDraft,
  termMonths,
  errors,
  ask,
  preview,
  onMethodChange,
  onDownPaymentChange,
  onTermChange,
}: {
  paymentMethod: PaymentMethod;
  downPaymentDraft: string;
  termMonths: FinancingTerm;
  errors: SalePaymentFieldErrors;
  ask: number;
  preview: ReturnType<typeof computeFinancing> | null;
  onMethodChange: (method: PaymentMethod) => void;
  onDownPaymentChange: (value: string) => void;
  onTermChange: (term: FinancingTerm) => void;
}) {
  const financedTotal =
    preview && paymentMethod === "financing"
      ? preview.downPayment + preview.monthlyPayment * preview.termMonths
      : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--lot-border)] bg-white/70 p-4">
      <p className="text-sm font-bold text-[var(--lot-ink)]">How will they pay?</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Payment method">
        <button
          type="button"
          aria-pressed={paymentMethod === "upfront"}
          className={
            paymentMethod === "upfront" ? "dealership-chip dealership-chip-on" : "dealership-chip"
          }
          onClick={() => onMethodChange("upfront")}
        >
          Pay up front
        </button>
        <button
          type="button"
          aria-pressed={paymentMethod === "financing"}
          className={
            paymentMethod === "financing" ? "dealership-chip dealership-chip-on" : "dealership-chip"
          }
          onClick={() => onMethodChange("financing")}
        >
          Monthly plan
        </button>
      </div>
      {paymentMethod === "financing" ? (
        <>
          <Field label="Down payment today" error={errors.downPayment}>
            <input
              type="text"
              inputMode="numeric"
              value={downPaymentDraft}
              onChange={(e) => onDownPaymentChange(e.target.value)}
              placeholder="0"
              className="dealership-input"
            />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--lot-ink)]">Term</span>
            {errors.termMonths ? (
              <span className="dealership-field-error">{errors.termMonths}</span>
            ) : null}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Financing term">
              {FINANCING_TERMS.map((months) => (
                <button
                  key={months}
                  type="button"
                  aria-pressed={termMonths === months}
                  className={
                    termMonths === months ? "dealership-chip dealership-chip-on" : "dealership-chip"
                  }
                  onClick={() => onTermChange(months)}
                >
                  {months} mo
                </button>
              ))}
            </div>
          </div>
          {preview ? (
            <p className="text-sm text-[var(--lot-muted)]">
              {preview.downPayment > 0 ? (
                <>
                  Down {formatDollars(preview.downPayment)} today, then{" "}
                </>
              ) : null}
              {formatDollars(preview.monthlyPayment)}/mo for {preview.termMonths} months
              {financedTotal > 0 ? (
                <span> (about {formatDollars(financedTotal)} total)</span>
              ) : null}
              . Sale price {formatDollars(ask)}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--lot-muted)]">
          Full amount {formatDollars(ask)} due at signing.
        </p>
      )}
    </div>
  );
}

function TabChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={active ? "dealership-chip dealership-chip-on" : "dealership-chip"}
    >
      {children}
    </button>
  );
}

function BuyerForm({
  buyer,
  errors,
  onChange,
}: {
  buyer: CustomerInput;
  errors: CustomerFieldErrors;
  onChange: (next: CustomerInput) => void;
}) {
  function field<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    onChange({ ...buyer, [key]: value });
  }

  return (
    <div className="dealership-form-grid">
      <Field label="Name" required error={errors.name}>
        <input
          type="text"
          autoComplete="name"
          value={buyer.name}
          onChange={(e) => field("name", e.target.value)}
          className="dealership-input"
        />
      </Field>
      <Field label="Email" required error={errors.email}>
        <input
          type="email"
          autoComplete="email"
          value={buyer.email}
          onChange={(e) => field("email", e.target.value)}
          className="dealership-input"
        />
      </Field>
      <Field label="Phone" required error={errors.phone}>
        <input
          type="tel"
          autoComplete="tel"
          value={buyer.phone}
          onChange={(e) => field("phone", e.target.value)}
          className="dealership-input"
        />
      </Field>
      <Field label="Age" error={errors.age}>
        <input
          type="number"
          min={16}
          max={120}
          placeholder="Optional"
          value={buyer.age ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            field("age", v === "" ? null : Number(v));
          }}
          className="dealership-input"
        />
      </Field>
      <Field label="Address" className="dealership-form-span" error={errors.address}>
        <input
          type="text"
          autoComplete="street-address"
          value={buyer.address}
          onChange={(e) => field("address", e.target.value)}
          className="dealership-input"
        />
      </Field>
      <Field label="Notes" className="dealership-form-span" error={errors.notes}>
        <textarea
          rows={3}
          value={buyer.notes}
          onChange={(e) => field("notes", e.target.value)}
          className="dealership-input min-h-[4.5rem] resize-y"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-semibold text-[var(--lot-ink)] ${className}`}>
      <span>
        {label}
        {required ? <span className="text-[var(--lot-accent)]"> *</span> : null}
      </span>
      {children}
      {error ? <span className="dealership-field-error">{error}</span> : null}
    </label>
  );
}

function EmployeeCard({
  employee,
  vehicleIds,
  vehicleNameById,
  removeArmed,
  onRemove,
}: {
  employee: Employee;
  vehicleIds: string[];
  vehicleNameById: Record<string, string>;
  removeArmed: boolean;
  onRemove: () => void;
}) {
  const labels = vehicleIds
    .map((id) => vehicleNameById[id] ?? id)
    .sort((a, b) => a.localeCompare(b));

  return (
    <li className="dealership-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-[var(--lot-ink)]">{employee.name}</p>
          {employee.role ? (
            <p className="text-sm text-[var(--lot-muted)]">{employee.role}</p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--lot-muted)]">
            {labels.length === 0
              ? "No cars assigned yet."
              : `${labels.length} car${labels.length === 1 ? "" : "s"}: ${labels.join(", ")}`}
          </p>
        </div>
        <button type="button" className="dealership-btn-ghost" onClick={onRemove}>
          {removeArmed ? "Remove?" : "Remove"}
        </button>
      </div>
    </li>
  );
}

function CustomerCard({
  customer,
  crm,
  expanded,
  onToggle,
  onMarkPayment,
}: {
  customer: Customer;
  crm: CrmState;
  expanded: boolean;
  onToggle: () => void;
  onMarkPayment: (saleLogId: string) => void;
}) {
  const count = customerSaleCount(crm, customer.id);
  const lastAt = customerLastSaleAt(crm, customer.id);
  const purchases = crm.sales
    .filter((s) => s.customerId === customer.id)
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt));

  return (
    <li className="dealership-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-[var(--lot-ink)]">{customer.name}</p>
          <p className="text-sm text-[var(--lot-muted)]">
            {customer.email} · {customer.phone}
          </p>
          {customer.address ? (
            <p className="text-sm text-[var(--lot-muted)]">{customer.address}</p>
          ) : null}
          {customer.age !== null ? (
            <p className="text-xs text-[var(--lot-muted)]">Age {customer.age}</p>
          ) : null}
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-[var(--lot-ink)]">{count} sale{count === 1 ? "" : "s"}</p>
          {lastAt ? (
            <p className="text-[var(--lot-muted)]">Last {formatSaleDate(lastAt)}</p>
          ) : null}
        </div>
      </div>
      {customer.notes ? (
        <p className="mt-2 text-sm text-[var(--lot-muted)]">{customer.notes}</p>
      ) : null}
      <button type="button" className="dealership-btn-ghost mt-3" onClick={onToggle}>
        {expanded ? "Hide purchases" : "Show purchases"}
      </button>
      {expanded && purchases.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2 border-t border-dashed border-[var(--lot-border)] pt-3">
          {purchases.map((entry) => (
            <li key={entry.id} className="text-sm">
              <span className="font-semibold">{entry.vehicleName}</span>
              {" · "}
              {formatDollars(entry.ask)} profit {formatDollars(entry.profit)}
              {" · "}
              <SaleStatusBadge status={entry.status} />
              <FinancingTracker entry={entry} onMarkPayment={onMarkPayment} compact />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function SaleLogRow({
  entry,
  onMarkPayment,
  onOpen,
}: {
  entry: SaleLogEntry;
  onMarkPayment: (saleLogId: string) => void;
  onOpen: () => void;
}) {
  const muted = entry.status === "restocked";
  const canMark = saleCanMarkPayment(entry);
  return (
    <li
      className={`dealership-card flex flex-wrap items-stretch justify-between gap-2 p-2 ${muted ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="dealership-card flex min-w-0 flex-1 cursor-pointer flex-wrap items-center justify-between gap-2 border-0 px-3 py-2 text-left shadow-none"
      >
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-[var(--lot-ink)]">{entry.vehicleName}</p>
          <p className="text-sm text-[var(--lot-muted)]">
            {entry.customerSnapshot.name} · {formatSaleDate(entry.soldAt)}
          </p>
          <p className="text-xs font-semibold text-[var(--lot-muted)]">{formatPaymentPlan(entry)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-[var(--lot-accent)]">{formatDollars(entry.ask)}</p>
          <p className="text-[var(--lot-muted)]">Profit {formatDollars(entry.profit)}</p>
          <SaleStatusBadge status={entry.status} />
        </div>
      </button>
      {canMark ? (
        <button
          type="button"
          className="dealership-btn-ghost self-center"
          onClick={() => onMarkPayment(entry.id)}
        >
          Mark payment
        </button>
      ) : null}
    </li>
  );
}

function SaleStatusBadge({ status }: { status: SaleLogEntry["status"] }) {
  const label = status === "restocked" ? "Restocked" : "Completed";
  return (
    <span
      className={
        status === "restocked"
          ? "dealership-status-badge dealership-status-restocked"
          : "dealership-status-badge dealership-status-done"
      }
    >
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dealership-card px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--lot-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[var(--lot-ink)]">{value}</p>
    </div>
  );
}

function SpecRow({
  label,
  value,
  mono,
  swatch,
}: {
  label: string;
  value: string;
  mono?: boolean;
  swatch?: string;
}) {
  return (
    <div className="dealership-spec-row">
      <dt className="text-xs font-bold uppercase tracking-widest text-[var(--lot-muted)]">{label}</dt>
      <dd className={`flex items-center gap-2 font-semibold text-[var(--lot-ink)] ${mono ? "font-mono text-sm" : ""}`}>
        {swatch ? (
          <span
            className="dealership-color-swatch"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
        ) : null}
        {value}
      </dd>
    </div>
  );
}
