"use client";

type BonusPopup = { id: number; text: string };

type HillClimbHudProps = {
  fuel: number;
  fuelMax: number;
  coins: number;
  diamonds: number;
  rpm: number;
  speedKmh: number;
  distanceM: number;
  bestM: number;
  nextFuelM: number;
  gasDown: boolean;
  brakeDown: boolean;
  popups: BonusPopup[];
  onGasDown: (down: boolean) => void;
  onBrakeDown: (down: boolean) => void;
  onPause: () => void;
};

export function HillClimbHud({
  fuel,
  fuelMax,
  coins,
  diamonds,
  rpm,
  speedKmh,
  distanceM,
  bestM,
  nextFuelM,
  gasDown,
  brakeDown,
  popups,
  onGasDown,
  onBrakeDown,
  onPause,
}: HillClimbHudProps) {
  const fuelPct = fuelMax > 0 ? fuel / fuelMax : 0;
  const lowFuel = fuelPct < 0.2 && fuel > 0;
  const midFuel = fuelPct < 0.5 && !lowFuel;
  const rpmDeg = rpm * 270 - 135;
  const speedDeg = Math.min(1, speedKmh / 140) * 270 - 135;
  const dist = Math.floor(distanceM);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      <div className="pointer-events-auto flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="flex max-w-[55%] flex-col gap-1.5">
          <div
            className={`hill-climb-fuel-panel flex items-center gap-2 rounded-lg px-2 py-1.5 ${lowFuel ? "hill-climb-fuel-low" : ""}`}
            aria-label={`Fuel ${Math.round(fuelPct * 100)} percent`}
          >
            <span className="hill-climb-fuel-can-icon text-lg" aria-hidden>
              ⛽
            </span>
            <div className="hill-climb-fuel-can relative h-6 w-28 overflow-hidden rounded-md border-[3px] border-stone-800 sm:w-32">
              <div
                className={`hill-climb-fuel-fill h-full ${lowFuel ? "bg-red-500" : midFuel ? "bg-yellow-400" : "bg-lime-500"}`}
                style={{ width: `${fuelPct * 100}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <span className="flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-0.5">
              <span className="hill-climb-coin-icon hill-climb-coin-icon-lg" aria-hidden />
              {coins.toLocaleString()}
            </span>
            {diamonds > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5">
                <span aria-hidden>💎</span> {diamonds.toLocaleString()}
              </span>
            )}
          </div>
          <div className="hidden sm:flex gap-1" aria-hidden>
            <Gauge label="RPM" degrees={rpmDeg} small />
            <Gauge label={String(Math.round(speedKmh))} degrees={speedDeg} small />
          </div>
        </div>
        <button type="button" onClick={onPause} aria-label="Pause game" className="hill-climb-pause-btn">
          ❚❚
        </button>
      </div>

      <div className="pointer-events-none mt-0 text-center sm:mt-1">
        <div className="hill-climb-distance-display inline-flex items-baseline gap-1 rounded-xl bg-black/50 px-3 py-0.5 sm:px-5 sm:py-1">
          <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">{dist}</span>
          <span className="text-sm font-bold text-white/80 sm:text-base">m</span>
        </div>
        <p className="mt-1 text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[11px]">
          {bestM > 0 ? `Best ${Math.floor(bestM)} m` : "No best yet"}
          {nextFuelM > 0 ? ` · Fuel ${Math.ceil(nextFuelM)} m` : ""}
        </p>
        <div className="mt-1 flex flex-col items-center">
          {popups.map((popup) => (
            <span key={popup.id} className="hill-climb-bonus-pop text-sm font-black text-amber-200">
              {popup.text}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between px-2 pb-3 sm:px-4 sm:pb-5">
        <Pedal
          label="BRAKE"
          pressed={brakeDown}
          tone="brake"
          ariaLabel="Brake — rotate forward in air"
          onDown={onBrakeDown}
        />
        <div className="w-8 sm:hidden" />
        <Pedal
          label="GAS"
          pressed={gasDown}
          tone="gas"
          ariaLabel="Gas — accelerate and backflip in air"
          onDown={onGasDown}
        />
      </div>
    </div>
  );
}

function Gauge({ label, degrees, small }: { label: string; degrees: number; small?: boolean }) {
  return (
    <div
      className={`relative rounded-full border-2 border-stone-700 bg-stone-800 shadow-inner ${small ? "h-10 w-10" : "h-14 w-14 border-[3px]"}`}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[42%] w-0.5 origin-bottom rounded-full bg-red-500"
        style={{ transform: `translate(-50%, -100%) rotate(${degrees}deg)` }}
      />
      <span className="absolute inset-0 flex items-center justify-center pt-2 text-[7px] font-bold text-stone-200">
        {label}
      </span>
    </div>
  );
}

function Pedal({
  label,
  pressed,
  tone,
  ariaLabel,
  onDown,
}: {
  label: string;
  pressed: boolean;
  tone: "gas" | "brake";
  ariaLabel: string;
  onDown: (down: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`hill-climb-pedal pointer-events-auto ${tone === "gas" ? "hill-climb-pedal-gas" : "hill-climb-pedal-brake"} ${pressed ? "hill-climb-pedal-down" : ""}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown(true);
      }}
      onPointerUp={() => onDown(false)}
      onPointerCancel={() => onDown(false)}
      onPointerLeave={() => onDown(false)}
    >
      <span className="hill-climb-pedal-label">{label}</span>
    </button>
  );
}
