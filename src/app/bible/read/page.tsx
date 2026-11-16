import { BibleBooks } from "@/components/bible-books";
import { BibleBackLink, BibleKicker, BibleMain } from "@/components/bible-ui";

export default function BibleReadPage() {
  return (
    <BibleMain>
      <BibleBackLink href="/bible">← Bible Hub</BibleBackLink>
      <header className="max-w-3xl">
        <BibleKicker>Old and New Testament</BibleKicker>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="bible-title">Read</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--bible-muted)]">
          Pick a book, then a chapter. The translation you choose is remembered
          on this device.
        </p>
      </header>
      <BibleBooks />
    </BibleMain>
  );
}
