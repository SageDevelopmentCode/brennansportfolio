import { BookCover } from "@/components/book-cover";
import type { Work } from "@/lib/open-library";
import Link from "next/link";
import type { ReactNode } from "react";

type WorkDetailCardProps = {
  work: Work;
  children?: ReactNode;
};

export function WorkDetailCard({ work, children }: WorkDetailCardProps) {
  const authorKeys = work.authorKeys ?? [];

  return (
    <article className="library-glass-card flex flex-col gap-8 rounded-3xl p-6 shadow-lg sm:flex-row sm:p-8">
      <div className="library-cover-hover flex shrink-0 justify-center sm:w-52">
        <BookCover
          title={work.title}
          coverUrl={work.coverUrl}
          coverId={work.coverId}
          size="lg"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--library-ink)] sm:text-4xl">
              {work.title}
            </h1>
            {work.authors.length > 0 && (
              <p className="mt-2 text-lg text-[var(--library-muted)]">
                by{" "}
                {work.authors.map((name, i) => {
                  const authorKey = authorKeys[i];
                  if (authorKey) {
                    return (
                      <span key={authorKey}>
                        {i > 0 && (i < work.authors.length - 1 ? ", " : " and ")}
                        <Link
                          href={`/library/authors/${authorKey}`}
                          className="font-semibold text-[var(--library-accent)] hover:underline"
                        >
                          {name}
                        </Link>
                      </span>
                    );
                  }
                  return (
                    <span key={name}>
                      {i > 0 && (i < work.authors.length - 1 ? ", " : " and ")}
                      {name}
                    </span>
                  );
                })}
              </p>
            )}
            {work.firstPublishYear && (
              <p className="mt-1 text-sm font-semibold text-[var(--library-accent)]">
                First published {work.firstPublishYear}
              </p>
            )}
          </div>
          {children}
        </div>

        {work.description && (
          <div className="border-t border-[var(--library-border)] pt-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--library-muted)]">
              About
            </h2>
            <p className="mt-2 leading-relaxed text-[var(--library-ink)]">
              {work.description}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
