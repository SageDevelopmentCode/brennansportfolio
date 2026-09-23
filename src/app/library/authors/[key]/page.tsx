import { AuthorWorksList } from "@/components/author-works-list";
import { ReadMore } from "@/components/read-more";
import { getAuthor, getAuthorWorks } from "@/lib/open-library";
import Link from "next/link";
import { notFound } from "next/navigation";

type AuthorPageProps = {
  params: Promise<{ key: string }>;
};

function formatLifespan(birth?: string, death?: string): string | null {
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `b. ${birth}`;
  if (death) return `d. ${death}`;
  return null;
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { key } = await params;

  let author;
  let works;

  try {
    [author, works] = await Promise.all([getAuthor(key), getAuthorWorks(key)]);
  } catch {
    notFound();
  }

  const lifespan = formatLifespan(author.birthDate, author.deathDate);

  return (
    <main className="library-bg relative flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/library"
        className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--library-border)] bg-[var(--library-glass)] px-4 py-2 text-sm font-semibold text-[var(--library-accent)] backdrop-blur-sm transition hover:border-[var(--library-accent)] hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
      >
        ← Back to search
      </Link>

      <header className="library-hero-glow relative z-10 flex flex-col gap-6 rounded-3xl border border-[var(--library-border)] p-6 sm:flex-row sm:items-start sm:p-8">
        <div className="library-cover-hover flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-[var(--library-accent)] shadow-[0_0_32px_rgba(245,158,11,0.3)]">
          {author.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.photoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-5xl text-[var(--library-accent)]" aria-hidden>✍</span>
          )}
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-[var(--library-ink)] sm:text-5xl">
            {author.name}
          </h1>
          {lifespan && (
            <p className="mt-2 text-lg text-[var(--library-muted)]">{lifespan}</p>
          )}
          {author.bio && (
            <div className="mt-4 max-w-2xl">
              <ReadMore text={author.bio} />
            </div>
          )}
        </div>
      </header>

      <section className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold text-[var(--library-ink)]">
            Works
          </h2>
          <span className="rounded-full bg-[var(--library-accent-soft)] px-3 py-1 text-sm font-bold text-[var(--library-accent)] ring-1 ring-[var(--library-border)]">
            {works.length} in the stacks
          </span>
        </div>
        <AuthorWorksList works={works} />
      </section>
    </main>
  );
}
