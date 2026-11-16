import { BibleMemorize } from "@/components/bible-memorize";
import { BibleBackLink, BibleKicker, BibleMain } from "@/components/bible-ui";

export default function BibleMemorizePage() {
  return (
    <BibleMain>
      <BibleBackLink href="/bible">← Bible Hub</BibleBackLink>
      <header className="max-w-3xl">
        <BibleKicker>Practice on this device</BibleKicker>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="bible-title">Memorize</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--bible-muted)]">
          Due verses come first. Peek at a blank word if you need it, then mark
          whether you knew the verse.
        </p>
      </header>
      <BibleMemorize />
    </BibleMain>
  );
}
