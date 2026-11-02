"use client";

import { DeliveryAnimalStore } from "@/components/delivery-animal-store";
import { DeliveryFleetPanel } from "@/components/delivery-fleet-panel";
import { DeliveryMapScene } from "@/components/delivery-map-scene";
import {
  addDeliverySkateboard,
  buyDeliveryAnimal,
  creditDeliveryEarnings,
  getDeliveryCompanyState,
  listDeliverySkateboards,
  type DeliveryCompanyState,
  type DeliverySkateboard,
} from "@/lib/delivery";
import {
  advanceRushSim,
  assignPackage,
  autoAssignPackages,
  buildBoard,
  createInitialRushState,
  totalEarnForCredits,
  type DeliveryRushState,
} from "@/lib/delivery-packages";
import type { DeliveryAnimalId } from "@/lib/delivery-mounts";
import {
  difficultyTierFromWallMs,
  MAX_WALL_DELTA_MS,
  spawnIntervalForTier,
  type SimSpeed,
} from "@/lib/delivery-rush-difficulty";
import { createClient } from "@/lib/supabase/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Panel = "store" | "hire" | null;

const EMPTY_COMPANY: DeliveryCompanyState = {
  balance: 0,
  ownedMountIds: [],
  assignedMountIds: [],
  foodStock: {},
};

const SIM_LOOP_MS = 250;

function DeliveryOverlay({
  title,
  titleId,
  onClose,
  children,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[min(85vh,40rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-sky-100 via-amber-50 to-teal-100 p-5 text-stone-900 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-display)] text-2xl font-bold"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-stone-300 px-3 py-1 text-sm font-bold text-stone-700 transition hover:bg-white/80"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DeliveryAppClient() {
  const [panel, setPanel] = useState<Panel>(null);
  const [company, setCompany] = useState<DeliveryCompanyState>(EMPTY_COMPANY);
  const [skateboards, setSkateboards] = useState<DeliverySkateboard[]>([]);
  const [rush, setRush] = useState<DeliveryRushState>(() =>
    createInitialRushState(),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mount, setMount] = useState<DeliveryAnimalId | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<DeliveryAnimalId | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [earnFlashAmount, setEarnFlashAmount] = useState(0);
  const [simSpeed, setSimSpeed] = useState<SimSpeed>(1);
  const [simNowMs, setSimNowMs] = useState(() => Date.now());
  const [wallHudNow, setWallHudNow] = useState(() => Date.now());
  const creditedPackageIdsRef = useRef(new Set<string>());
  const rushRef = useRef(rush);
  const simNowMsRef = useRef(simNowMs);
  const lastWallTickRef = useRef(Date.now());
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed;

  const resetSimClock = useCallback(() => {
    const t = Date.now();
    simNowMsRef.current = t;
    lastWallTickRef.current = t;
    setSimNowMs(t);
    setWallHudNow(t);
  }, []);

  const difficultyTier = useMemo(
    () => difficultyTierFromWallMs(rush.startedAt, wallHudNow),
    [rush.startedAt, wallHudNow],
  );

  const commitRush = useCallback((next: DeliveryRushState) => {
    rushRef.current = next;
    setRush(next);
  }, []);

  const board = useMemo(
    () => buildBoard(rush.pending, rush.inTransit, skateboards),
    [rush.pending, rush.inTransit, skateboards],
  );

  const busyCourierIds = useMemo(
    () => new Set(board.busyCourierIds),
    [board.busyCourierIds],
  );

  const depotCouriers = useMemo(
    () => skateboards.filter((c) => !busyCourierIds.has(c.id)),
    [skateboards, busyCourierIds],
  );

  const availableForHire = useMemo(() => {
    const assigned = new Set(company.assignedMountIds);
    return company.ownedMountIds.filter((id) => !assigned.has(id));
  }, [company]);

  const idleCouriersOnLot = useMemo(() => {
    const busy = new Set(board.busyCourierIds);
    return skateboards.filter((c) => !busy.has(c.id));
  }, [board.busyCourierIds, skateboards]);

  const refreshCompany = useCallback(async () => {
    const supabase = createClient();
    const [state, rows] = await Promise.all([
      getDeliveryCompanyState(supabase),
      listDeliverySkateboards(supabase),
    ]);

    setCompany(state);
    setSkateboards(rows);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoadError(null);
      void refreshCompany()
        .catch(() => {
          setLoadError("Could not load company data. Try refreshing.");
        })
        .finally(() => setLoading(false));
    });
  }, [refreshCompany]);

  useEffect(() => {
    if (rush.gameOver) {
      setAutoAssignEnabled(false);
    }
  }, [rush.gameOver]);

  useEffect(() => {
    if (!autoAssignEnabled || rush.gameOver) return;

    const result = autoAssignPackages(rush, skateboards, undefined, {
      nowMs: simNowMsRef.current,
    });
    if (!result.ok) return;

    setAssignError(null);
    commitRush(result.state);
  }, [
    autoAssignEnabled,
    rush.gameOver,
    rush.pending,
    rush.inTransit,
    skateboards,
    commitRush,
  ]);

  useEffect(() => {
    if (rush.gameOver) return;
    const id = window.setInterval(() => {
      const wallNow = Date.now();
      const rawDelta = wallNow - lastWallTickRef.current;
      const delta = Math.min(rawDelta, MAX_WALL_DELTA_MS);
      lastWallTickRef.current = wallNow;
      const tier = difficultyTierFromWallMs(rushRef.current.startedAt, wallNow);
      const spawnInterval = spawnIntervalForTier(tier);
      const simAdvance = delta * simSpeedRef.current;
      const advanced = advanceRushSim(
        rushRef.current,
        simNowMsRef.current,
        simAdvance,
        spawnInterval,
      );
      simNowMsRef.current = advanced.endSimMs;
      setSimNowMs(simNowMsRef.current);
      setWallHudNow(wallNow);

      const freshCredits = advanced.completedCredits.filter(
        (credit) => !creditedPackageIdsRef.current.has(credit.packageId),
      );
      const idsToCredit = freshCredits.map((credit) => credit.packageId);
      const earnTotal = totalEarnForCredits(freshCredits);
      for (const packageId of idsToCredit) {
        creditedPackageIdsRef.current.add(packageId);
      }
      // #region agent log
      if (advanced.completedCredits.length > 0 || idsToCredit.length > 0) {
        fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "b6c579",
          },
          body: JSON.stringify({
            sessionId: "b6c579",
            runId: "post-fix",
            hypothesisId: "H1",
            location: "delivery-app-client.tsx:tick",
            message: "tick saw completed deliveries",
            data: {
              completed: advanced.completedCredits.length,
              fresh: idsToCredit.length,
              earnTotal,
              deliveredCount: advanced.state.deliveredCount,
              gameOver: advanced.state.gameOver,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion

      commitRush(advanced.state);

      // #region agent log
      if (idsToCredit.length > 0) {
        fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "b6c579",
          },
          body: JSON.stringify({
            sessionId: "b6c579",
            runId: "post-fix",
            hypothesisId: "H1",
            location: "delivery-app-client.tsx:afterTick",
            message: "sync check after tick",
            data: { idsToCredit: idsToCredit.length, earnTotal },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion

      if (idsToCredit.length === 0) return;

      const sourceIds = idsToCredit;
      const earned = earnTotal;
      void (async () => {
        try {
          const supabase = createClient();
          const credit = await creditDeliveryEarnings(
            supabase,
            sourceIds,
            earned,
          );
          // #region agent log
          fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "b6c579",
            },
            body: JSON.stringify({
              sessionId: "b6c579",
              runId: "post-fix",
              hypothesisId: credit.ok ? "H3" : "H2",
              location: "delivery-app-client.tsx:creditResult",
              message: "creditDeliveryEarnings returned",
              data: {
                ok: credit.ok,
                code: credit.ok ? null : credit.code,
                balance: credit.ok ? credit.balance : null,
                creditedCount: credit.ok ? credit.creditedCount : null,
                earnTotal: earned,
                sourceCount: sourceIds.length,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          if (!credit.ok) {
            for (const packageId of sourceIds) {
              creditedPackageIdsRef.current.delete(packageId);
            }
            return;
          }
          setCompany((current) => ({ ...current, balance: credit.balance }));
          if (credit.creditedCount > 0 && earned > 0) {
            setEarnFlashAmount(earned);
          }
        } catch (error) {
          const details =
            error && typeof error === "object"
              ? (error as { message?: string; code?: string; details?: string })
              : null;
          // #region agent log
          fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "b6c579",
            },
            body: JSON.stringify({
              sessionId: "b6c579",
              runId: "post-fix",
              hypothesisId: "H4",
              location: "delivery-app-client.tsx:creditCatch",
              message: "creditDeliveryEarnings threw",
              data: {
                error:
                  details?.message ??
                  (error instanceof Error ? error.message : String(error)),
                code: details?.code ?? null,
                details: details?.details ?? null,
                earnTotal: earned,
                sourceCount: sourceIds.length,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          for (const packageId of sourceIds) {
            creditedPackageIdsRef.current.delete(packageId);
          }
        }
      })();
    }, SIM_LOOP_MS);
    return () => window.clearInterval(id);
  }, [rush.gameOver, skateboards, commitRush]);

  useEffect(() => {
    if (earnFlashAmount <= 0) return;
    const id = window.setTimeout(() => setEarnFlashAmount(0), 2000);
    return () => window.clearTimeout(id);
  }, [earnFlashAmount]);

  const hireMount =
    mount && availableForHire.includes(mount)
      ? mount
      : (availableForHire[0] ?? null);

  async function handleBuy(mountId: DeliveryAnimalId) {
    setBuyingId(mountId);
    setBuyError(null);
    try {
      const supabase = createClient();
      const result = await buyDeliveryAnimal(supabase, mountId);
      if (!result.ok) {
        setBuyError(
          result.code === "insufficient_funds"
            ? "Not enough cash."
            : result.code === "already_owned"
              ? "Someone already bought this one."
              : "Could not buy. Try again.",
        );
        return;
      }
      await refreshCompany();
    } catch {
      setBuyError("Could not buy. Try again.");
    } finally {
      setBuyingId(null);
    }
  }

  async function addCourier() {
    const trimmed = name.trim();
    if (!trimmed || !hireMount || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      const supabase = createClient();
      const result = await addDeliverySkateboard(supabase, {
        name: trimmed,
        mount: hireMount,
      });

      if (!result.ok) {
        setSaveError(
          result.code === "invalid_name"
            ? "Enter a name."
            : result.code === "not_owned"
              ? "Buy this animal in the store first."
              : result.code === "mount_in_use"
                ? "That animal already has a courier."
                : "Could not add courier. Try again.",
        );
        return;
      }

      setName("");
      await refreshCompany();
    } catch {
      setSaveError("Could not add courier. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleAssign(packageId: string, skateboardId: string) {
    setAssignError(null);
    const result = assignPackage(
      rush,
      packageId,
      skateboardId,
      skateboards,
      undefined,
      { nowMs: simNowMsRef.current },
    );
    if (!result.ok) {
      setAssignError(
        result.code === "game_over"
          ? "Game over — play again to keep going."
          : result.code === "courier_busy"
            ? "That courier is already out."
            : result.code === "not_pending"
              ? "Package already taken."
              : "Could not assign. Try again.",
      );
      return;
    }
    commitRush(result.state);
  }

  function handleRestartRush() {
    setAssignError(null);
    creditedPackageIdsRef.current.clear();
    setEarnFlashAmount(0);
    commitRush(createInitialRushState());
    resetSimClock();
  }

  return (
    <section className="w-full max-w-5xl">
      {loading ? (
        <p className="text-stone-600">Loading…</p>
      ) : loadError ? (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {loadError}
        </p>
      ) : (
        <DeliveryMapScene
          company={company}
          couriers={idleCouriersOnLot}
          depotCouriers={depotCouriers}
          board={board}
          gameOver={rush.gameOver}
          deliveredCount={rush.deliveredCount}
          earnFlashAmount={earnFlashAmount}
          assignError={assignError}
          onAssign={handleAssign}
          autoAssignEnabled={autoAssignEnabled}
          onAutoAssignEnabledChange={setAutoAssignEnabled}
          simSpeed={simSpeed}
          onSimSpeedChange={setSimSpeed}
          difficultyTier={difficultyTier}
          simNowMs={simNowMs}
          onRestartRush={handleRestartRush}
          onOpenStore={() => {
            setBuyError(null);
            setPanel("store");
          }}
          onOpenHire={() => {
            setSaveError(null);
            setPanel("hire");
          }}
        />
      )}

      {panel === "store" ? (
        <DeliveryOverlay
          title="Animal store"
          titleId="delivery-store-title"
          onClose={() => setPanel(null)}
        >
          <DeliveryAnimalStore
            company={company}
            buyingId={buyingId}
            buyError={buyError}
            onBuy={(id) => void handleBuy(id)}
          />
        </DeliveryOverlay>
      ) : null}

      {panel === "hire" ? (
        <DeliveryOverlay
          title="Hire a courier"
          titleId="delivery-hire-title"
          onClose={() => setPanel(null)}
        >
          <DeliveryFleetPanel
            name={name}
            mount={hireMount}
            availableForHire={availableForHire}
            saving={saving}
            saveError={saveError}
            onNameChange={setName}
            onMountChange={(id) => setMount(id)}
            onSubmit={() => void addCourier()}
          />
        </DeliveryOverlay>
      ) : null}
    </section>
  );
}
