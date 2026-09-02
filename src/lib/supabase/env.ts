export const hasSupabaseEnvVars =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
