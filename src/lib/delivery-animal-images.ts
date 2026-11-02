import type { DeliveryAnimalId } from "@/lib/delivery-mounts";
import { getAnimal } from "@/lib/delivery-mounts";

/** Make-believe couriers use AI art in public/delivery/animals/. */
export const DELIVERY_FANTASY_ANIMAL_IDS: DeliveryAnimalId[] = [
  "pegasus",
  "phoenix",
  "griffin",
  "basilisk",
  "hydra",
  "kraken",
  "dragon",
  "leviathan",
  "chimera",
  "storm_serpent",
  "cosmic_serpent",
  "golden_kraken",
  "sky_titan",
];

/** Local file for each courier (see scripts/fetch-delivery-animal-photos.mjs). */
export function deliveryAnimalImageSrc(id: DeliveryAnimalId): string {
  return `/delivery/animals/${id}.jpg`;
}

export function deliveryAnimalUsesFantasyArt(id: DeliveryAnimalId): boolean {
  return DELIVERY_FANTASY_ANIMAL_IDS.includes(id);
}

export function deliveryAnimalImageAlt(id: DeliveryAnimalId): string {
  const animal = getAnimal(id);
  if (deliveryAnimalUsesFantasyArt(id)) {
    return `${animal.label} — make-believe courier art`;
  }
  return `${animal.label} photo`;
}
