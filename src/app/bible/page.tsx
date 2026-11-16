import { BibleHome } from "@/components/bible-home";
import { BibleBackLink, BibleKicker, BibleMain } from "@/components/bible-ui";

export default function BiblePage() {
  return (
    <BibleMain>
      <BibleBackLink href="/">← All projects</BibleBackLink>
      <header className="max-w-3xl">
        <BibleKicker>Read and remember</BibleKicker>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="bible-title">Brennan&apos;s Bible Hub</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--bible-muted)]">
          Read a chapter, start from today&apos;s verse, and practice verses you
          want to remember. Everything you save stays on this device.
        </p>
      </header>
      <BibleHome />
    </BibleMain>
  );
}
