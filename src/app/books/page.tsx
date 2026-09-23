import { BooksPageClient } from "@/components/books-page-client";
import { getCurrentUsername } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function BooksPage() {
  const supabase = await createClient();
  const [{ data: books }, currentUsername] = await Promise.all([
    supabase
      .from("books")
      .select("id, name, score, pages, series")
      .order("score", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true }),
    getCurrentUsername(supabase),
  ]);

  return (
    <BooksPageClient
      initialBooks={books ?? []}
      currentUsername={currentUsername}
    />
  );
}
