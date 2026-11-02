export type ShelterRole = "visitor" | "worker";

const AVAILABLE_LINES = [
  "Yeah, {name}'s still in the building. Back row. Don't open the door labeled \"DEFINITELY NOT LISTINGS.\"",
  "{name}? Totally available. I would know. I work here. Probably.",
  "Oh sure, we've got {name}. Just ignore the clipboard I keep hiding behind my back.",
  "{name} is free to go home. Unlike me. I live in the break room now.",
];

const TAKEN_LINES = [
  "{name} already left. I told the customer they were \"on a spiritual journey.\"",
  "Nope, {name}'s gone — already taken. Tell 'em to try again tomorrow. Or never.",
  "{name} got adopted. I may have cried. In a cool, mysterious way.",
  "Not available. I'd say game over for visitors, but you're staff. You're fine.",
];

function pickRandom(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export function getWorkerQuip(petName: string, available: boolean): string {
  const template = pickRandom(available ? AVAILABLE_LINES : TAKEN_LINES);
  return template.replaceAll("{name}", petName);
}

export const WORKER_DISPLAY_NAME = "Gary";
export const WORKER_TAGLINE =
  "Night shift. Three name tags. Zero explanations.";
