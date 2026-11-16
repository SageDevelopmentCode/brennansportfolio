import { BibleChapter } from "@/components/bible-chapter";
import { BibleBackLink, BibleMain } from "@/components/bible-ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type BibleChapterPageProps = {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{
    verse?: string | string[];
    verseEnd?: string | string[];
  }>;
};

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number > 0 ? number : null;
}

function titleFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }: BibleChapterPageProps): Promise<Metadata> {
  const { book, chapter } = await params;
  return { title: `${titleFromSlug(book)} ${chapter} · Bible Hub` };
}

export default async function BibleChapterPage({
  params,
  searchParams,
}: BibleChapterPageProps) {
  const { book, chapter } = await params;
  const query = await searchParams;
  const chapterNumber = positiveInteger(chapter);
  if (!chapterNumber) notFound();

  const verse = positiveInteger(one(query.verse));
  const verseEnd = positiveInteger(one(query.verseEnd));

  return (
    <BibleMain>
      <BibleBackLink href="/bible/read">← Books</BibleBackLink>
      <BibleChapter
        book={decodeURIComponent(book)}
        chapter={chapterNumber}
        verse={verse}
        verseEnd={verseEnd && verse && verseEnd > verse ? verseEnd : verse}
      />
    </BibleMain>
  );
}
