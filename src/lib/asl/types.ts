export type SignTokenKind = "word" | "letter";

export type SignToken = {
  kind: SignTokenKind;
  /** Display label (gloss or letter) */
  gloss: string;
  imageSrc: string;
  /** Key for 3D hand pose (letter or dictionary image id) */
  poseId: string;
};

export type SignSequenceResult = {
  tokens: SignToken[];
  /** Characters that could not be fingerspelled (non a–z) */
  skippedChars: string[];
};
