"use client";

import {
  type SaleLogEntry,
  financingPaidCount,
  formatPaymentPlan,
  saleCanMarkPayment,
} from "@/lib/dealership-crm";

export function FinancingTracker({
  entry,
  onMarkPayment,
  compact,
}: {
  entry: SaleLogEntry;
  onMarkPayment: (saleLogId: string) => void;
  compact?: boolean;
}) {
  const plan = formatPaymentPlan(entry);
  const canMark = saleCanMarkPayment(entry);
  const paid = entry.financing !== undefined ? financingPaidCount(entry.financing) : 0;
  const total = entry.financing?.termMonths ?? 0;

  if (entry.paymentMethod !== "financing" || !entry.financing) {
    return (
      <p className={`${compact ? "text-xs" : "text-sm"} text-[var(--lot-muted)]`}>{plan}</p>
    );
  }

  return (
    <div className={compact ? "mt-2 flex flex-wrap items-center gap-2" : "mt-2 flex flex-col gap-2"}>
      <p className="text-sm text-[var(--lot-muted)]">
        {plan}
        {entry.status === "restocked" ? " · Restocked" : null}
      </p>
      {!compact && entry.status === "completed" ? (
        <p className="text-sm font-semibold text-[var(--lot-ink)]">
          Payments: {paid} of {total}
        </p>
      ) : null}
      {canMark ? (
        <button
          type="button"
          className="dealership-btn-ghost"
          onClick={() => onMarkPayment(entry.id)}
        >
          Mark payment
        </button>
      ) : entry.status === "completed" && paid >= total && total > 0 ? (
        <span className="dealership-status-badge dealership-status-done">Paid off</span>
      ) : null}
    </div>
  );
}
