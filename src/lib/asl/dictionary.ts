export type DictionaryEntry = {
  gloss: string;
  imageId: string;
};

/** Normalized English lemma → ASL gloss + asset id under public/asl/words/ */
const ENTRIES: Record<string, DictionaryEntry> = {
  hello: { gloss: "HELLO", imageId: "hello" },
  hi: { gloss: "HELLO", imageId: "hello" },
  hey: { gloss: "HELLO", imageId: "hello" },
  thanks: { gloss: "THANK-YOU", imageId: "thank_you" },
  thank: { gloss: "THANK-YOU", imageId: "thank_you" },
  please: { gloss: "PLEASE", imageId: "please" },
  sorry: { gloss: "SORRY", imageId: "sorry" },
  yes: { gloss: "YES", imageId: "yes" },
  no: { gloss: "NO", imageId: "no" },
  help: { gloss: "HELP", imageId: "help" },
  name: { gloss: "NAME", imageId: "name" },
  friend: { gloss: "FRIEND", imageId: "friend" },
  family: { gloss: "FAMILY", imageId: "family" },
  love: { gloss: "LOVE", imageId: "love" },
  like: { gloss: "LIKE", imageId: "like" },
  want: { gloss: "WANT", imageId: "want" },
  need: { gloss: "NEED", imageId: "need" },
  go: { gloss: "GO", imageId: "go" },
  come: { gloss: "COME", imageId: "come" },
  stop: { gloss: "STOP", imageId: "stop" },
  wait: { gloss: "WAIT", imageId: "wait" },
  eat: { gloss: "EAT", imageId: "eat" },
  drink: { gloss: "DRINK", imageId: "drink" },
  water: { gloss: "WATER", imageId: "water" },
  food: { gloss: "FOOD", imageId: "food" },
  home: { gloss: "HOME", imageId: "home" },
  school: { gloss: "SCHOOL", imageId: "school" },
  work: { gloss: "WORK", imageId: "work" },
  teacher: { gloss: "TEACHER", imageId: "teacher" },
  student: { gloss: "STUDENT", imageId: "student" },
  learn: { gloss: "LEARN", imageId: "learn" },
  read: { gloss: "READ", imageId: "read" },
  write: { gloss: "WRITE", imageId: "write" },
  talk: { gloss: "TALK", imageId: "talk" },
  hear: { gloss: "HEAR", imageId: "hear" },
  deaf: { gloss: "DEAF", imageId: "deaf" },
  happy: { gloss: "HAPPY", imageId: "happy" },
  sad: { gloss: "SAD", imageId: "sad" },
  angry: { gloss: "ANGRY", imageId: "angry" },
  tired: { gloss: "TIRED", imageId: "tired" },
  good: { gloss: "GOOD", imageId: "good" },
  bad: { gloss: "BAD", imageId: "bad" },
  morning: { gloss: "MORNING", imageId: "morning" },
  night: { gloss: "NIGHT", imageId: "night" },
  today: { gloss: "TODAY", imageId: "today" },
  tomorrow: { gloss: "TOMORROW", imageId: "tomorrow" },
  yesterday: { gloss: "YESTERDAY", imageId: "yesterday" },
  where: { gloss: "WHERE", imageId: "where" },
  what: { gloss: "WHAT", imageId: "what" },
  who: { gloss: "WHO", imageId: "who" },
  why: { gloss: "WHY", imageId: "why" },
  how: { gloss: "HOW", imageId: "how" },
  when: { gloss: "WHEN", imageId: "when" },
  bathroom: { gloss: "BATHROOM", imageId: "bathroom" },
  doctor: { gloss: "DOCTOR", imageId: "doctor" },
  mom: { gloss: "MOTHER", imageId: "mother" },
  mother: { gloss: "MOTHER", imageId: "mother" },
  dad: { gloss: "FATHER", imageId: "father" },
  father: { gloss: "FATHER", imageId: "father" },
  boy: { gloss: "BOY", imageId: "boy" },
  girl: { gloss: "GIRL", imageId: "girl" },
  man: { gloss: "MAN", imageId: "man" },
  woman: { gloss: "WOMAN", imageId: "woman" },
  child: { gloss: "CHILD", imageId: "child" },
  baby: { gloss: "BABY", imageId: "baby" },
  dog: { gloss: "DOG", imageId: "dog" },
  cat: { gloss: "CAT", imageId: "cat" },
  understand: { gloss: "UNDERSTAND", imageId: "understand" },
  know: { gloss: "KNOW", imageId: "know" },
  fine: { gloss: "FINE", imageId: "fine" },
  okay: { gloss: "OK", imageId: "ok" },
  ok: { gloss: "OK", imageId: "ok" },
};

export function lookupDictionaryWord(word: string): DictionaryEntry | null {
  return ENTRIES[word] ?? null;
}

export function wordSignImageSrc(imageId: string): string {
  return `/asl/words/${imageId}.svg`;
}

export function fingerspellImageSrc(letter: string): string {
  return `/asl/fingerspell/${letter.toLowerCase()}.svg`;
}

export const dictionaryWordCount = Object.keys(ENTRIES).length;
