"use client";

type ShelterDeathScreenProps = {
  petName: string;
  onRetry: () => void;
};

export function ShelterDeathScreen({ petName, onRetry }: ShelterDeathScreenProps) {
  return (
    <div
      className="shelter-death-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
      role="alertdialog"
      aria-labelledby="shelter-death-title"
      aria-describedby="shelter-death-desc"
    >
      <div className="shelter-death-panel shelter-shake max-w-md">
        <p className="text-6xl" aria-hidden>💀</p>
        <h2
          id="shelter-death-title"
          className="mt-4 text-4xl font-extrabold uppercase tracking-tight text-white"
        >
          Game over
        </h2>
        <p
          id="shelter-death-desc"
          className="mt-4 text-lg font-medium text-red-100"
        >
          {petName} is not available. In this shelter, that means{" "}
          <span className="font-extrabold text-white">you didn&apos;t make it</span>.
          (Don&apos;t worry — it&apos;s just the game. Try another pet!)
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="shelter-death-btn mt-8"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
