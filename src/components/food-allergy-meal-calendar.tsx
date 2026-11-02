"use client";

import {
  formatMealPlanDateLabel,
  getLocalDateKey,
  listMealPlanDates,
  parseDateKeyToLocalDate,
} from "@/lib/food-allergies";
import { useEffect, useMemo, useState } from "react";

type FoodAllergyMealCalendarProps = {
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  planVersion?: number;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(viewYear: number, viewMonth: number): (string | null)[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: startPad }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    cells.push(getLocalDateKey(d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function FoodAllergyMealCalendar({
  selectedDateKey,
  onSelectDate,
  planVersion = 0,
}: FoodAllergyMealCalendarProps) {
  const selectedDate = parseDateKeyToLocalDate(selectedDateKey);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    const d = parseDateKeyToLocalDate(selectedDateKey);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedDateKey]);

  const todayKey = getLocalDateKey();
  const plannedSet = useMemo(() => {
    void planVersion;
    return new Set(listMealPlanDates());
  }, [planVersion]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells = buildMonthGrid(viewYear, viewMonth);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <section className="allergies-calendar rounded-2xl border border-[var(--allergies-border)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--allergies-ink)]">
          Pick a date
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="allergies-calendar-nav"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="min-w-[10rem] text-center text-sm font-bold text-[var(--allergies-ink)]">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="allergies-calendar-nav"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--allergies-muted)]">
        Planning for <span className="font-bold text-[var(--allergies-ink)]">{formatMealPlanDateLabel(selectedDateKey)}</span>
      </p>

      <label className="mt-3 flex flex-col gap-1 text-xs font-bold text-[var(--allergies-muted)]">
        Jump to date
        <input
          type="date"
          value={selectedDateKey}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) return;
            onSelectDate(value);
            const d = parseDateKeyToLocalDate(value);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
          }}
          className="allergies-input !py-2 !text-sm"
        />
      </label>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-[var(--allergies-muted)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((dateKey, index) => {
          if (!dateKey) {
            return <div key={`empty-${index}`} className="aspect-square" aria-hidden />;
          }
          const dayNum = parseDateKeyToLocalDate(dateKey).getDate();
          const isSelected = dateKey === selectedDateKey;
          const isToday = dateKey === todayKey;
          const hasPlan = plannedSet.has(dateKey);
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`allergies-calendar-day aspect-square ${isSelected ? "allergies-calendar-day-selected" : ""} ${isToday ? "allergies-calendar-day-today" : ""}`}
              aria-pressed={isSelected}
              aria-label={formatMealPlanDateLabel(dateKey)}
            >
              <span>{dayNum}</span>
              {hasPlan && <span className="allergies-calendar-dot" aria-hidden />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          onSelectDate(todayKey);
          const d = parseDateKeyToLocalDate(todayKey);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }}
        className="allergies-btn-secondary mt-4 w-full !min-h-[40px] !text-sm"
      >
        Go to today
      </button>
    </section>
  );
}
