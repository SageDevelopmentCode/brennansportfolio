import { FavoriteButton } from "@/components/favorite-button";
import { WorkDetailCard } from "@/components/work-detail-card";
import { getCurrentUsername } from "@/lib/auth";
import { isFavorited } from "@/lib/favorites";
import { getWork } from "@/lib/open-library";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type WorkPageProps = {
  params: Promise<{ key: string }>;
};

export default async function WorkPage({ params }: WorkPageProps) {
  const { key } = await params;
  const supabase = await createClient();
  const currentUsername = await getCurrentUsername(supabase);

  let work;
  try {
    work = await getWork(key);
  } catch {
    notFound();
  }

  const favorited = currentUsername ? await isFavorited(supabase, key) : false;

  return (
    <main className="library-bg relative flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/library"
        className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--library-border)] bg-[var(--library-glass)] px-4 py-2 text-sm font-semibold text-[var(--library-accent)] backdrop-blur-sm transition hover:border-[var(--library-accent)] hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
      >
        ← Back to search
      </Link>

      <div className="relative z-10 max-w-4xl">
        <WorkDetailCard work={work}>
          <FavoriteButton
            workKey={work.key}
            initialFavorited={favorited}
            isLoggedIn={currentUsername !== null}
            favoriteData={{
              workKey: work.key,
              title: work.title,
              authorNames: work.authors,
              coverId: work.coverId,
              firstPublishYear: work.firstPublishYear,
            }}
          />
        </WorkDetailCard>
      </div>
    </main>
  );
}
