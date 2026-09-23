import type { SupabaseClient } from "@supabase/supabase-js";

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const USERNAME_VALIDATION_MESSAGE =
  "Username must be 3–20 characters: lowercase letters, numbers, underscore, or period.";

export const EMAIL_VALIDATION_MESSAGE = "Please enter a valid email address.";

export const LOGIN_ERROR_MESSAGE = "Invalid username, email, or password.";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export async function signUpWithUsername(
  supabase: SupabaseClient,
  username: string,
  email: string,
  password: string,
) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  if (!isValidUsername(normalizedUsername)) {
    return { error: USERNAME_VALIDATION_MESSAGE };
  }

  if (!isValidEmail(normalizedEmail)) {
    return { error: EMAIL_VALIDATION_MESSAGE };
  }

  const { data: existing } = await supabase
    .from("users")
    .select("username")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existing) {
    return { error: "Username already taken." };
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { username: normalizedUsername },
    },
  });

  if (signUpError) {
    const message = signUpError.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already been registered")) {
      return { error: "Email already in use." };
    }
    if (message.includes("duplicate") && message.includes("username")) {
      return { error: "Username already taken." };
    }
    if (message.includes("duplicate") && message.includes("email")) {
      return { error: "Email already in use." };
    }
    return { error: signUpError.message };
  }

  if (!authData.user) {
    return { error: "Sign up failed. Please try again." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "Sign up failed. Please try again." };
  }

  return { error: null };
}

export async function signInWithUsername(
  supabase: SupabaseClient,
  username: string,
  email: string,
  password: string,
) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  if (!isValidUsername(normalizedUsername) || !isValidEmail(normalizedEmail)) {
    return { error: LOGIN_ERROR_MESSAGE };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (!profile || profile.email !== normalizedEmail) {
    return { error: LOGIN_ERROR_MESSAGE };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { error: LOGIN_ERROR_MESSAGE };
  }

  return { error: null };
}

export async function signOut(supabase: SupabaseClient) {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentUsername(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.username ?? null;
}
