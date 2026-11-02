export const GYM_DESK_CHARACTER = "Butt Face";
export const GYM_DESK_TAGLINE =
  "Front desk legend. Names are on the name tag.";

export type DenialStoryBeat = {
  durationMs: number;
  caption: string;
  line: string | null;
  showCharacter: boolean;
  showStamp: boolean;
};

export const GYM_DENIAL_STORY: DenialStoryBeat[] = [
  {
    durationMs: 0,
    caption: "The owner taps DENY on their phone.",
    line: null,
    showCharacter: false,
    showStamp: false,
  },
  {
    durationMs: 2800,
    caption: "Butt Face clears his throat into the microphone.",
    line: "Attention, family in the lobby.",
    showCharacter: true,
    showStamp: false,
  },
  {
    durationMs: 3200,
    caption: "Rule 47 of the membership handbook.",
    line:
      "Section 12, subsection B: no one whose name rhymes with \"gym\" may enter on a Friday. I don't make the rules. I just invented them.",
    showCharacter: true,
    showStamp: false,
  },
  {
    durationMs: 3000,
    caption: "He taps the laminated sign.",
    line:
      "Also your shoes look like they came from a yard sale that was on fire. The treadmill has standards.",
    showCharacter: true,
    showStamp: false,
  },
  {
    durationMs: 2400,
    caption: "DENIED.",
    line: "…not today, champ.",
    showCharacter: true,
    showStamp: true,
  },
  {
    durationMs: 2600,
    caption: "Please exit through the gift shop.",
    line:
      "We sell protein bars and regret. Have a nice walk home — cardio is cardio.",
    showCharacter: true,
    showStamp: false,
  },
];

export const GYM_DENIAL_TOTAL_MS = GYM_DENIAL_STORY.reduce(
  (sum, b) => sum + b.durationMs,
  0,
);
