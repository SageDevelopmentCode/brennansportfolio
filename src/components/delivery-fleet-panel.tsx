"use client";

import {
  formatAnimalSpeed,
  formatCapacity,
  formatDietNeed,
  formatEarnPerPackage,
  getAnimal,
  type DeliveryAnimalId,
} from "@/lib/delivery-mounts";

type DeliveryFleetPanelProps = {
  name: string;
  mount: DeliveryAnimalId | null;
  availableForHire: DeliveryAnimalId[];
  saving: boolean;
  saveError: string | null;
  onNameChange: (value: string) => void;
  onMountChange: (id: DeliveryAnimalId) => void;
  onSubmit: () => void;
};

export function DeliveryFleetPanel({
  name,
  mount,
  availableForHire,
  saving,
  saveError,
  onNameChange,
  onMountChange,
  onSubmit,
}: DeliveryFleetPanelProps) {
  const preview = mount ? getAnimal(mount) : null;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex flex-col gap-2 text-sm font-semibold text-orange-100">
        Name
        <input
          autoFocus
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Courier name"
          disabled={saving}
          className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-orange-300 disabled:opacity-60"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-orange-100">
          Assign an owned animal (not in use)
        </legend>
        {availableForHire.length === 0 ? (
          <p className="text-sm text-orange-100/70">
            Buy animals in the store first, or free one up from your fleet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableForHire.map((id) => {
              const option = getAnimal(id);
              const selected = mount === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={saving}
                  onClick={() => onMountChange(id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition disabled:opacity-60 ${
                    selected
                      ? "border-teal-300 bg-teal-400/20 ring-2 ring-teal-300/50"
                      : "border-white/15 bg-white/10 hover:border-white/30"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {option.emoji}
                  </span>
                  <span className="text-xs font-bold text-orange-50">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {preview ? (
        <div
          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
          aria-live="polite"
        >
          <p className="font-bold text-orange-50">
            {preview.emoji} {preview.label} stats
          </p>
          <p className="mt-2 text-orange-100/80">
            Speed: {formatAnimalSpeed(preview)}
          </p>
          <p className="text-orange-100/80">
            Capacity: {formatCapacity(preview.capacity)}
          </p>
          <p className="text-orange-100/80">
            Cash: {formatEarnPerPackage(preview)}
          </p>
          <p className="text-orange-100/80">Needs: {formatDietNeed(preview)}</p>
          {preview.power ? (
            <p className="mt-2 text-violet-100/90">
              <span className="font-bold">{preview.power.name}:</span>{" "}
              {preview.power.blurb}
            </p>
          ) : null}
        </div>
      ) : null}

      {saveError ? (
        <p className="text-sm font-semibold text-red-300" role="alert">
          {saveError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || !mount || availableForHire.length === 0}
        className="w-fit rounded-full bg-teal-400 px-5 py-3 text-sm font-bold text-stone-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Adding…" : "Add to fleet"}
      </button>
    </form>
  );
}
