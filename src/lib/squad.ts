import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImageToWebp } from "@/lib/squad-images";

export const SQUAD_BUCKET = "squad-ping";
export const SQUAD_AVATARS = ["🦈", "🐯", "🚀", "👾", "🎮", "⚡", "🛸", "🎯"] as const;
export const SQUAD_TAPBACKS = ["❤️", "👍", "👎", "😂", "‼️", "❓"] as const;

export const SQUAD_BLASTS = [
  { id: "fire", label: "Fire", body: "🔥🔥🔥" },
  { id: "laugh", label: "Laugh", body: "😂😂😂" },
  { id: "skull", label: "Skull", body: "💀💀💀" },
  { id: "party", label: "Party", body: "🎉🎉🎉" },
  { id: "rocket", label: "Rocket", body: "🚀🚀🚀" },
] as const;

const PROFILE_KEY = "squad-ping-profile";
const LAST_BASE_KEY = "squad-ping-last-base";

export type SquadProfile = {
  callSign: string;
  avatar: string;
  photoUrl: string | null;
};

export type SquadBase = {
  id: string;
  code: string;
  name: string;
};

export type SquadMessageKind = "text" | "image";

export type SquadMessage = {
  id: string;
  baseId: string;
  userId: string;
  callSign: string;
  avatar: string;
  photoUrl: string | null;
  body: string;
  kind: SquadMessageKind;
  messagePhotoUrl: string | null;
  createdAt: string;
};

export type SquadMember = {
  userId: string;
  callSign: string;
  avatar: string;
  photoUrl: string | null;
  wallpaperUrl: string | null;
};

export type SquadInboxChat = {
  baseId: string;
  code: string;
  name: string;
  preview: string;
  lastAt: string | null;
  wallpaperUrl: string | null;
};

export type SquadReaction = {
  messageId: string;
  userId: string;
  emoji: string;
};

export type CreateSquadBaseResult =
  | { ok: true; base: SquadBase }
  | {
      ok: false;
      code:
        | "not_authenticated"
        | "invalid_name"
        | "invalid_call_sign"
        | "unknown";
    };

export type JoinSquadBaseResult =
  | { ok: true; base: SquadBase }
  | {
      ok: false;
      code:
        | "not_authenticated"
        | "invalid_code"
        | "invalid_call_sign"
        | "not_found"
        | "unknown";
    };

export function loadSquadProfile(): SquadProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SquadProfile;
    if (!parsed.callSign?.trim()) return null;
    return {
      callSign: parsed.callSign.trim(),
      avatar: parsed.avatar || SQUAD_AVATARS[0],
      photoUrl: parsed.photoUrl ?? null,
    };
  } catch {
    return null;
  }
}

export function saveSquadProfile(profile: SquadProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      callSign: profile.callSign.trim(),
      avatar: profile.avatar,
      photoUrl: profile.photoUrl,
    }),
  );
}

export function loadLastBaseId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_BASE_KEY);
}

export function saveLastBaseId(baseId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_BASE_KEY, baseId);
}

export async function ensureSquadAuth(supabase: SupabaseClient) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return sessionData.session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    const msg = error?.message ?? "Could not start Squad Ping session";
    if (msg.includes("Database error creating anonymous user")) {
      throw new Error(
        "Anonymous sign-in is blocked by the database (signup trigger). Apply the latest Supabase migration allow_anonymous_auth_users, or run that SQL in the Supabase SQL editor.",
      );
    }
    throw new Error(msg);
  }
  return data.user.id;
}

export async function fetchSquadProfileFromDb(
  supabase: SupabaseClient,
  userId: string,
): Promise<SquadProfile | null> {
  const { data, error } = await supabase
    .from("squad_user_profiles")
    .select("call_sign, avatar, photo_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    callSign: data.call_sign,
    avatar: data.avatar,
    photoUrl: data.photo_url,
  };
}

export async function uploadSquadImage(
  supabase: SupabaseClient,
  userId: string,
  storagePath: string,
  file: File,
): Promise<string | null> {
  const blob = await compressImageToWebp(file);
  const path = storagePath.startsWith(`${userId}/`)
    ? storagePath
    : `${userId}/${storagePath}`;

  const { error } = await supabase.storage
    .from(SQUAD_BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/webp" });

  if (error) return null;

  const { data } = supabase.storage.from(SQUAD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mapBase(row: { id: string; code: string; name: string }): SquadBase {
  return { id: row.id, code: row.code, name: row.name };
}

function mapMessage(row: {
  id: string;
  base_id: string;
  user_id: string;
  call_sign: string;
  avatar: string;
  body: string;
  kind: string;
  photo_url: string | null;
  created_at: string;
}): SquadMessage {
  return {
    id: row.id,
    baseId: row.base_id,
    userId: row.user_id,
    callSign: row.call_sign,
    avatar: row.avatar,
    photoUrl: null,
    body: row.body,
    kind: row.kind === "image" ? "image" : "text",
    messagePhotoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

export async function createSquadBase(
  supabase: SupabaseClient,
  name: string,
  profile: SquadProfile,
): Promise<CreateSquadBaseResult> {
  const { data, error } = await supabase.rpc("squad_create_base", {
    p_name: name,
    p_call_sign: profile.callSign,
    p_avatar: profile.avatar,
    p_photo_url: profile.photoUrl,
  });

  if (error) return { ok: false, code: "unknown" };

  const payload = data as {
    ok?: boolean;
    code?: string;
    base_id?: string;
    name?: string;
  };

  if (!payload.ok || !payload.base_id || !payload.code || !payload.name) {
    const code = payload.code;
    if (
      code === "not_authenticated" ||
      code === "invalid_name" ||
      code === "invalid_call_sign"
    ) {
      return { ok: false, code };
    }
    return { ok: false, code: "unknown" };
  }

  return {
    ok: true,
    base: {
      id: payload.base_id,
      code: payload.code,
      name: payload.name,
    },
  };
}

export async function joinSquadBase(
  supabase: SupabaseClient,
  code: string,
  profile: SquadProfile,
): Promise<JoinSquadBaseResult> {
  const { data, error } = await supabase.rpc("squad_join_base", {
    p_code: code,
    p_call_sign: profile.callSign,
    p_avatar: profile.avatar,
    p_photo_url: profile.photoUrl,
  });

  if (error) return { ok: false, code: "unknown" };

  const payload = data as {
    ok?: boolean;
    code?: string;
    base_id?: string;
    name?: string;
  };

  if (!payload.ok || !payload.base_id || !payload.code || !payload.name) {
    const errCode = payload.code;
    if (
      errCode === "not_authenticated" ||
      errCode === "invalid_code" ||
      errCode === "invalid_call_sign" ||
      errCode === "not_found"
    ) {
      return { ok: false, code: errCode };
    }
    return { ok: false, code: "unknown" };
  }

  return {
    ok: true,
    base: {
      id: payload.base_id,
      code: payload.code,
      name: payload.name,
    },
  };
}

export async function updateSquadProfileRemote(
  supabase: SupabaseClient,
  profile: SquadProfile,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("squad_update_profile", {
    p_call_sign: profile.callSign,
    p_avatar: profile.avatar,
    p_photo_url: profile.photoUrl,
  });
  if (error) return false;
  const payload = data as { ok?: boolean };
  return Boolean(payload.ok);
}

export async function setSquadWallpaper(
  supabase: SupabaseClient,
  baseId: string,
  wallpaperUrl: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("squad_set_wallpaper", {
    p_base_id: baseId,
    p_wallpaper_url: wallpaperUrl ?? "",
  });
  if (error) return false;
  const payload = data as { ok?: boolean };
  return Boolean(payload.ok);
}

export async function listMySquadChats(
  supabase: SupabaseClient,
): Promise<SquadInboxChat[]> {
  const { data, error } = await supabase.rpc("squad_list_my_chats");
  if (error) return [];

  const payload = data as {
    ok?: boolean;
    chats?: Array<{
      base_id: string;
      code: string;
      name: string;
      preview: string;
      last_at: string | null;
      wallpaper_url: string | null;
    }>;
  };

  if (!payload.ok || !payload.chats) return [];

  return payload.chats.map((row) => ({
    baseId: row.base_id,
    code: row.code,
    name: row.name,
    preview: row.preview,
    lastAt: row.last_at,
    wallpaperUrl: row.wallpaper_url,
  }));
}

export async function fetchSquadBase(
  supabase: SupabaseClient,
  baseId: string,
): Promise<SquadBase | null> {
  const { data, error } = await supabase
    .from("squad_bases")
    .select("id, code, name")
    .eq("id", baseId)
    .maybeSingle();

  if (error || !data) return null;
  return mapBase(data);
}

export async function fetchMyWallpaper(
  supabase: SupabaseClient,
  baseId: string,
): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("squad_members")
    .select("wallpaper_url")
    .eq("base_id", baseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.wallpaper_url;
}

export async function isSquadMember(
  supabase: SupabaseClient,
  baseId: string,
): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from("squad_members")
    .select("user_id")
    .eq("base_id", baseId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function fetchSquadMembers(
  supabase: SupabaseClient,
  baseId: string,
): Promise<SquadMember[]> {
  const { data, error } = await supabase
    .from("squad_members")
    .select("user_id, call_sign, avatar, photo_url, wallpaper_url")
    .eq("base_id", baseId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    userId: row.user_id,
    callSign: row.call_sign,
    avatar: row.avatar,
    photoUrl: row.photo_url,
    wallpaperUrl: row.wallpaper_url,
  }));
}

export async function fetchSquadMessages(
  supabase: SupabaseClient,
  baseId: string,
  limit = 100,
): Promise<SquadMessage[]> {
  const { data, error } = await supabase
    .from("squad_messages")
    .select(
      "id, base_id, user_id, call_sign, avatar, body, kind, photo_url, created_at",
    )
    .eq("base_id", baseId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapMessage);
}

export async function fetchSquadReactions(
  supabase: SupabaseClient,
  baseId: string,
): Promise<SquadReaction[]> {
  const { data: messages, error: msgErr } = await supabase
    .from("squad_messages")
    .select("id")
    .eq("base_id", baseId);

  if (msgErr || !messages?.length) return [];

  const ids = messages.map((m) => m.id);
  const { data, error } = await supabase
    .from("squad_message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", ids);

  if (error || !data) return [];

  return data.map((row) => ({
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji,
  }));
}

export async function toggleSquadReaction(
  supabase: SupabaseClient,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;

  const { data: existing } = await supabase
    .from("squad_message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from("squad_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    return !error;
  }

  const { error } = await supabase.from("squad_message_reactions").upsert(
    {
      message_id: messageId,
      user_id: userId,
      emoji,
    },
    { onConflict: "message_id,user_id" },
  );

  return !error;
}

export async function sendSquadMessage(
  supabase: SupabaseClient,
  baseId: string,
  profile: SquadProfile,
  body: string,
): Promise<{ ok: true } | { ok: false }> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 200) {
    return { ok: false };
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false };

  const { error } = await supabase.from("squad_messages").insert({
    base_id: baseId,
    user_id: userId,
    call_sign: profile.callSign,
    avatar: profile.avatar,
    body: trimmed,
    kind: "text",
  });

  return error ? { ok: false } : { ok: true };
}

export async function sendSquadImageMessage(
  supabase: SupabaseClient,
  baseId: string,
  profile: SquadProfile,
  photoUrl: string,
): Promise<{ ok: true } | { ok: false }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false };

  const { error } = await supabase.from("squad_messages").insert({
    base_id: baseId,
    user_id: userId,
    call_sign: profile.callSign,
    avatar: profile.avatar,
    body: "Photo",
    kind: "image",
    photo_url: photoUrl,
  });

  return error ? { ok: false } : { ok: true };
}

export function formatJoinCodeInput(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

export function formatSquadTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shouldShowTimestamp(
  prev: string | null,
  current: string,
  gapMs = 15 * 60 * 1000,
): boolean {
  if (!prev) return true;
  return new Date(current).getTime() - new Date(prev).getTime() >= gapMs;
}

export function squadDisplayName(profile: {
  callSign: string;
  avatar: string;
}): string {
  return profile.callSign;
}

export function squadInitials(callSign: string): string {
  const parts = callSign.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return callSign.slice(0, 2).toUpperCase();
}
