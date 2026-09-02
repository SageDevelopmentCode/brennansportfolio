import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnvVars } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasSupabaseEnvVars) {
    return NextResponse.json(
      {
        connected: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      },
      { status: 500 },
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { connected: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ connected: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 },
    );
  }
}
