import { HubHero } from "@/components/hub-hero";
import { HubProjectsSection } from "@/components/hub-projects-section";
import { getCityFavoriteCount, getLatestCityFavorite } from "@/lib/city-favorites";
import { getFavoriteCount } from "@/lib/favorites";
import { getHomeworkPreview } from "@/lib/homework-hub";
import { jonathanProjects, mainProjects } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

function formatEventDate(date: string, time: string) {
  return new Date(`${date}T${time}`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function Home() {
  const supabase = await createClient();
  const [
    { data: nextEvent },
    { count: bookCount },
    { data: topBook },
    favoriteCount,
    cityFavoriteCount,
    latestCityFavorite,
    homeworkPreview,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("name, date, time")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase
      .from("books")
      .select("name, score")
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getFavoriteCount(supabase),
    getCityFavoriteCount(supabase),
    getLatestCityFavorite(supabase),
    getHomeworkPreview(supabase),
  ]);

  const overlookPreview = nextEvent
    ? {
        name: nextEvent.name,
        date: formatEventDate(nextEvent.date, nextEvent.time),
      }
    : null;

  const bookPreview = {
    count: bookCount ?? 0,
    topBook:
      topBook?.score !== null && topBook
        ? { name: topBook.name, score: topBook.score }
        : null,
  };

  const libraryPreview = {
    favoriteCount,
  };

  const skylinePreview = {
    favoriteCount: cityFavoriteCount,
    latestCity: latestCityFavorite?.name ?? null,
  };

  return (
    <div className="hub-theme hub-bg-mesh relative flex min-h-[calc(100dvh-5rem)] flex-1 flex-col">
      <div aria-hidden className="hub-orb hub-orb-1" />
      <div aria-hidden className="hub-orb hub-orb-2" />
      <div aria-hidden className="hub-orb hub-orb-3" />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-14 px-4 py-10 sm:gap-16 sm:px-6 sm:py-16">
        <HubHero />

        <HubProjectsSection
          mainProjects={mainProjects}
          jonathanProjects={jonathanProjects}
          overlookPreview={overlookPreview}
          bookPreview={bookPreview}
          libraryPreview={libraryPreview}
          skylinePreview={skylinePreview}
          homeworkPreview={homeworkPreview}
        />
      </main>
    </div>
  );
}
