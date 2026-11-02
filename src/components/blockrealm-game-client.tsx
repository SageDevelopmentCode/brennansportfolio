"use client";

/**
 * Block Realm uses @react-three/fiber + drei (already in this repo) for a
 * documented first-person Three.js loop in the App Router. Voxels are drawn
 * as a few InstancedMeshes — not thousands of React nodes — then rebuilt
 * only when the chunk changes.
 */
import {
  canBreakHit,
  canPlaceAt,
  defaultSpawn,
  formatCoords,
  placeCellFromHit,
  type Vec3,
  type VoxelHit,
} from "@/lib/blockrealm-controls";
import {
  BlockId,
  generateFlatWorld,
  getBlockDef,
  HOTBAR_BLOCKS,
  loadSavedState,
  saveWorldState,
  setBlock,
  type BlockId as BlockIdType,
} from "@/lib/blockrealm-world";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const BlockRealmScene = dynamic(() => import("@/components/blockrealm-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm font-semibold text-white/70">
      Loading world…
    </div>
  ),
});

const SAVE_DEBOUNCE_MS = 1000;

export function BlockRealmGameClient() {
  const voxelsRef = useRef<Uint8Array>(generateFlatWorld());
  const playerRef = useRef<Vec3>(defaultSpawn());
  const lockFnRef = useRef<(() => void) | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const selectedRef = useRef<BlockIdType>(BlockId.Grass);
  const showCoordsRef = useRef(false);
  const [canLock, setCanLock] = useState(false);

  const [revision, setRevision] = useState(0);
  const [spawnToken, setSpawnToken] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<BlockIdType>(BlockId.Grass);
  const [showCoords, setShowCoords] = useState(false);
  const [coords, setCoords] = useState(formatCoords(8, 5, 8));
  const [locked, setLocked] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [viewport, setViewport] = useState<"unknown" | "mobile" | "desktop">(
    "unknown",
  );
  const [hydrated, setHydrated] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  selectedRef.current = selectedBlock;
  showCoordsRef.current = showCoords;

  const persist = useCallback(() => {
    saveWorldState(
      voxelsRef.current,
      selectedRef.current,
      showCoordsRef.current,
    );
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      persist();
    }, SAVE_DEBOUNCE_MS);
  }, [persist]);

  const bumpWorld = useCallback(() => {
    setRevision((value) => value + 1);
    scheduleSave();
  }, [scheduleSave]);

  useEffect(() => {
    const saved = loadSavedState();
    if (saved) {
      voxelsRef.current = saved.voxels;
      setSelectedBlock(saved.selectedBlock);
      setShowCoords(saved.showCoords);
      setRevision((value) => value + 1);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setViewport(media.matches ? "mobile" : "desktop");
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < HOTBAR_BLOCKS.length) {
        const next = HOTBAR_BLOCKS[index];
        selectedRef.current = next;
        setSelectedBlock(next);
        scheduleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scheduleSave]);

  const handleBreak = useCallback(
    (hit: VoxelHit) => {
      if (!canBreakHit(voxelsRef.current, hit)) return;
      setBlock(voxelsRef.current, hit.x, hit.y, hit.z, BlockId.Air);
      bumpWorld();
    },
    [bumpWorld],
  );

  const handlePlace = useCallback(
    (hit: VoxelHit) => {
      const cell = placeCellFromHit(hit);
      if (
        !canPlaceAt(
          voxelsRef.current,
          playerRef.current,
          cell.x,
          cell.y,
          cell.z,
        )
      ) {
        return;
      }
      setBlock(
        voxelsRef.current,
        cell.x,
        cell.y,
        cell.z,
        selectedBlock,
      );
      bumpWorld();
    },
    [bumpWorld, selectedBlock],
  );

  const handleSave = () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    persist();
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1200);
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset this world? Your saved blocks will be replaced with a new flat world.",
    );
    if (!confirmed) return;
    voxelsRef.current = generateFlatWorld();
    playerRef.current = defaultSpawn();
    persist();
    setRevision((value) => value + 1);
    setSpawnToken((value) => value + 1);
  };

  const handleSelect = (id: BlockIdType) => {
    selectedRef.current = id;
    setSelectedBlock(id);
    scheduleSave();
  };

  const handleToggleCoords = () => {
    setShowCoords((current) => {
      const next = !current;
      showCoordsRef.current = next;
      scheduleSave();
      return next;
    });
  };

  const selectedDef = getBlockDef(selectedBlock);
  const canPlay = hydrated && viewport === "desktop";

  return (
    <div className="space-y-4">
      <div className="blockrealm-viewport">
        {canPlay ? (
          <BlockRealmScene
            voxelsRef={voxelsRef}
            revision={revision}
            spawnToken={spawnToken}
            showCoords={showCoords}
            onLockChange={setLocked}
            onRegisterLock={(lock) => {
              lockFnRef.current = lock;
              setCanLock(true);
            }}
            onBreak={handleBreak}
            onPlace={handlePlace}
            onPlayerMove={(x, y, z) => setCoords(formatCoords(x, y, z))}
            onDayNight={setIsNight}
            playerRef={playerRef}
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center">
            <p className="max-w-sm text-base font-semibold text-white/80">
              {viewport === "mobile"
                ? "Best on desktop — this world needs a keyboard and mouse."
                : "Getting the realm ready…"}
            </p>
          </div>
        )}

        {canPlay && canLock && !locked ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 px-6">
            <button
              type="button"
              className="blockrealm-btn blockrealm-btn-primary pointer-events-auto min-h-12 px-8 text-base"
              onClick={() => lockFnRef.current?.()}
            >
              Click to play
            </button>
          </div>
        ) : null}

        {canPlay ? (
          <>
            <div className="blockrealm-crosshair" aria-hidden />
            <div className="pointer-events-none absolute left-4 top-4 z-40 flex flex-col gap-2">
              <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                {isNight ? "Night" : "Day"}
              </span>
              {showCoords ? (
                <span className="rounded-full bg-black/45 px-3 py-1 font-mono text-xs text-white">
                  {coords}
                </span>
              ) : null}
            </div>
            <p className="pointer-events-none absolute right-4 top-4 z-40 rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white">
              {selectedDef?.name ?? "Block"}
            </p>
            <div
              className={`absolute bottom-4 left-1/2 z-40 -translate-x-1/2 ${
                locked ? "pointer-events-none" : ""
              }`}
            >
              <div className="blockrealm-hotbar" role="toolbar" aria-label="Block hotbar">
                {HOTBAR_BLOCKS.map((id, index) => {
                  const def = getBlockDef(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className="blockrealm-hotbar-slot"
                      data-active={selectedBlock === id}
                      aria-label={`${index + 1}: ${def?.name ?? "Block"}`}
                      aria-pressed={selectedBlock === id}
                      onClick={() => handleSelect(id)}
                    >
                      <span
                        className="blockrealm-swatch"
                        style={{ background: def?.color }}
                      />
                      <span className="mt-0.5 text-[10px] font-bold text-white/80">
                        {index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="blockrealm-btn blockrealm-btn-primary"
          onClick={handleSave}
        >
          {saveFlash ? "Saved" : "Save world"}
        </button>
        <button type="button" className="blockrealm-btn" onClick={handleReset}>
          Reset world
        </button>
        <button
          type="button"
          className="blockrealm-btn"
          onClick={handleToggleCoords}
          aria-pressed={showCoords}
        >
          {showCoords ? "Hide coords" : "Show coords"}
        </button>
        <p className="text-sm text-[var(--blockrealm-muted)]">
          Auto-saves on this device. Esc unlocks the mouse.
        </p>
      </div>
    </div>
  );
}
