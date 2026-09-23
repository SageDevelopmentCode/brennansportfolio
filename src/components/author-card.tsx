import type { Author } from "@/lib/open-library";
import Link from "next/link";

type AuthorCardProps = {
  author: Author;
};

function formatLifespan(birth?: string, death?: string): string | null {
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `b. ${birth}`;
  if (death) return `d. ${death}`;
  return null;
}

export function AuthorCard({ author }: AuthorCardProps) {
  const lifespan = formatLifespan(author.birthDate, author.deathDate);

  return (
    <Link
      href={`/library/authors/${author.key}`}
      className="library-card library-glass-card group flex gap-4 rounded-2xl p-4 shadow-sm transition hover:border-[var(--library-accent)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.2)]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-[var(--library-border)] transition group-hover:ring-[var(--library-accent)] group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
        {author.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.photoUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-110"
          />
        ) : (
          <span className="text-2xl text-[var(--library-accent)]" aria-hidden>✍</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-lg font-bold text-[var(--library-ink)] group-hover:text-[var(--library-accent)]">
          {author.name}
        </h3>
        {lifespan && (
          <p className="text-sm text-[var(--library-muted)]">{lifespan}</p>
        )}
        {author.topWork && (
          <p className="mt-1 truncate text-sm text-[var(--library-muted)]">
            Known for: {author.topWork}
          </p>
        )}
        {author.workCount !== undefined && (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--library-accent)]">
            {author.workCount} works
          </p>
        )}
      </div>
    </Link>
  );
}
