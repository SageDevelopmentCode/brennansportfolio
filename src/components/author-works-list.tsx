import { BookCover } from "@/components/book-cover";
import type { Work } from "@/lib/open-library";
import Link from "next/link";

type AuthorWorksListProps = {
  works: Work[];
};

const BOOKS_PER_ROW = 5;

function chunkWorks(works: Work[], size: number): Work[][] {
  const rows: Work[][] = [];
  for (let i = 0; i < works.length; i += size) {
    rows.push(works.slice(i, i + size));
  }
  return rows;
}

export function AuthorWorksList({ works }: AuthorWorksListProps) {
  if (works.length === 0) {
    return (
      <p className="text-[var(--library-muted)]">
        No English editions with covers found for this author.
      </p>
    );
  }

  const rows = chunkWorks(works, BOOKS_PER_ROW);

  return (
    <div className="flex flex-col gap-10">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="library-shelf-row">
          {row.map((work, index) => (
            <div
              key={work.key}
              className="library-book-stand animate-library-slide-in flex flex-col items-center gap-2"
              style={{ animationDelay: `${(rowIndex * BOOKS_PER_ROW + index) * 40}ms` }}
            >
              <Link href={`/library/works/${work.key}`} className="block">
                <BookCover
                  title={work.title}
                  coverUrl={work.coverUrl}
                  coverId={work.coverId}
                  size="md"
                />
              </Link>
              <div className="w-28 text-center">
                <Link
                  href={`/library/works/${work.key}`}
                  className="line-clamp-2 text-sm font-semibold text-[var(--library-ink)] transition hover:text-[var(--library-accent)]"
                >
                  {work.title}
                </Link>
                {work.firstPublishYear && (
                  <p className="mt-0.5 text-xs text-[var(--library-muted)]">
                    {work.firstPublishYear}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
