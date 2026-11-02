"use client";

import Image from "next/image";
import { useState } from "react";
import type { DeliveryCompanyState } from "@/lib/delivery";
import {
  deliveryAnimalImageAlt,
  deliveryAnimalImageSrc,
} from "@/lib/delivery-animal-images";
import {
  MYTHIC_PRICE_THRESHOLD,
  animalsByPrice,
  formatAnimalSpeed,
  formatCapacity,
  formatDietNeed,
  formatEarnPerPackage,
  formatPrice,
  getAnimal,
  type DeliveryAnimalId,
} from "@/lib/delivery-mounts";

function AnimalStorePortrait({
  id,
  emoji,
  mythic,
}: {
  id: DeliveryAnimalId;
  emoji: string;
  mythic: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = deliveryAnimalImageSrc(id);

  if (imageFailed) {
    return (
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
    );
  }

  return (
    <div
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border shadow-sm ${
        mythic ? "border-violet-300 bg-violet-100" : "border-stone-200 bg-stone-100"
      }`}
    >
      <Image
        src={src}
        alt={deliveryAnimalImageAlt(id)}
        fill
        sizes="64px"
        className="object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

type DeliveryAnimalStoreProps = {
  company: DeliveryCompanyState;
  buyingId: DeliveryAnimalId | null;
  buyError: string | null;
  onBuy: (mountId: DeliveryAnimalId) => void;
};

function storeStatus(
  mountId: DeliveryAnimalId,
  company: DeliveryCompanyState,
): "buy" | "owned" | "in_use" | "too_expensive" {
  if (company.assignedMountIds.includes(mountId)) return "in_use";
  if (company.ownedMountIds.includes(mountId)) return "owned";
  const animal = getAnimal(mountId);
  if (company.balance < animal.price) return "too_expensive";
  return "buy";
}

function AnimalStoreCard({
  id,
  company,
  buyingId,
  onBuy,
  mythic,
}: {
  id: DeliveryAnimalId;
  company: DeliveryCompanyState;
  buyingId: DeliveryAnimalId | null;
  onBuy: (mountId: DeliveryAnimalId) => void;
  mythic: boolean;
}) {
  const animal = getAnimal(id);
  const status = storeStatus(id, company);
  const busy = buyingId === id;

  return (
    <li
      className={`flex flex-col gap-3 rounded-3xl border p-4 shadow-sm ${
        mythic
          ? "border-violet-300 bg-violet-50"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <AnimalStorePortrait id={id} emoji={animal.emoji} mythic={mythic} />
          <div>
            <p className="font-bold text-stone-900">{animal.label}</p>
            <p className="text-sm font-semibold text-teal-800">
              {formatPrice(animal.price)}
            </p>
          </div>
        </div>
      </div>
      <dl className="grid gap-1.5 text-sm text-stone-600">
        <div className="flex justify-between gap-3">
          <dt>Speed</dt>
          <dd className="font-semibold text-stone-900">{formatAnimalSpeed(animal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Capacity</dt>
          <dd className="font-semibold text-stone-900">{formatCapacity(animal.capacity)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Cash</dt>
          <dd className="font-semibold text-stone-900">{formatEarnPerPackage(animal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Diet</dt>
          <dd className="text-right font-semibold text-stone-900">
            {formatDietNeed(animal)}
          </dd>
        </div>
        {animal.power ? (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-violet-200 pt-2">
            <dt className="font-bold text-violet-900">{animal.power.name}</dt>
            <dd className="text-stone-700">{animal.power.blurb}</dd>
          </div>
        ) : null}
      </dl>
      {status === "buy" ? (
        <button
          type="button"
          disabled={busy || buyingId !== null}
          onClick={() => onBuy(id)}
          className="mt-auto rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-stone-950 transition hover:bg-orange-400 disabled:opacity-60"
        >
          {busy ? "Buying…" : "Buy"}
        </button>
      ) : status === "owned" ? (
        <p className="mt-auto text-sm font-semibold text-teal-800">
          Owned — hire a courier
        </p>
      ) : status === "in_use" ? (
        <p className="mt-auto text-sm font-semibold text-stone-700">
          In use by a courier
        </p>
      ) : (
        <p className="mt-auto text-sm font-semibold text-orange-800">
          Need more cash
        </p>
      )}
    </li>
  );
}

export function DeliveryAnimalStore({
  company,
  buyingId,
  buyError,
  onBuy,
}: DeliveryAnimalStoreProps) {
  const sorted = animalsByPrice();
  const standardIds = sorted.filter(
    (id) => getAnimal(id).price <= MYTHIC_PRICE_THRESHOLD,
  );
  const mythicIds = sorted.filter(
    (id) => getAnimal(id).price > MYTHIC_PRICE_THRESHOLD,
  );

  return (
    <div className="w-full">
      {buyError ? (
        <p className="mb-4 text-sm font-semibold text-red-600" role="alert">
          {buyError}
        </p>
      ) : null}
      <>
          <section className="mb-8">
            <h3 className="mb-3 text-sm font-bold tracking-wide text-stone-800 uppercase">
              Couriers
            </h3>
            <ul className="grid gap-4 sm:grid-cols-2">
              {standardIds.map((id) => (
                <AnimalStoreCard
                  key={id}
                  id={id}
                  company={company}
                  buyingId={buyingId}
                  onBuy={onBuy}
                  mythic={false}
                />
              ))}
            </ul>
          </section>
          {mythicIds.length > 0 ? (
            <section>
              <h3 className="mb-1 text-sm font-bold tracking-wide text-violet-900 uppercase">
                Mythic couriers
              </h3>
              <p className="mb-3 text-sm text-stone-700">
                Make-believe beasts over {formatPrice(MYTHIC_PRICE_THRESHOLD)}{" "}
                with real powers in the rush.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {mythicIds.map((id) => (
                  <AnimalStoreCard
                    key={id}
                    id={id}
                    company={company}
                    buyingId={buyingId}
                    onBuy={onBuy}
                    mythic
                  />
                ))}
              </ul>
            </section>
          ) : null}
      </>
    </div>
  );
}
