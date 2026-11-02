type DeliveryRushGameOverProps = {
  deliveredCount: number;
  onRestart: () => void;
};

export function DeliveryRushGameOver({
  deliveredCount,
  onRestart,
}: DeliveryRushGameOverProps) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-stone-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-rush-game-over-title"
    >
      <div className="max-w-sm rounded-3xl border border-red-300/60 bg-amber-50 px-6 py-5 text-center shadow-xl">
        <h2
          id="delivery-rush-game-over-title"
          className="font-[family-name:var(--font-display)] text-2xl font-bold text-red-700"
        >
          Dock overflow!
        </h2>
        <p className="mt-2 text-sm text-stone-700">
          Thirty packages were waiting at once. Assign riders faster next time.
        </p>
        {deliveredCount > 0 ? (
          <p className="mt-2 text-xs font-semibold text-teal-800">
            You still delivered {deliveredCount} this run.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className="mt-4 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-orange-400"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
