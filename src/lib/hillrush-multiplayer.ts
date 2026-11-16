import type { SupabaseClient } from "@supabase/supabase-js";

export const HILLRUSH_PAGE = "hillrush-page";
export const HILLRUSH_GAME = "hillrush-game";
export const HILLRUSH_NICK_KEY = "hillrush-nick";

export type HillRushMode = "survive" | "chase";
export type HillRushRole = "hunter" | "runner";
export type HillRushStatus = "lobby" | "racing" | "done";

export type HillRushRoom = {
  id: string;
  code: string;
  hostId: string;
  mode: HillRushMode;
  stageId: string;
  vehicleId: string;
  status: HillRushStatus;
  winnerId: string | null;
};

export type HillRushPlayer = {
  userId: string;
  nickname: string;
  color: string;
  role: HillRushRole;
  alive: boolean;
  distance: number;
  outReason: string | null;
};

export type HillRushSnapshot =
  | { ok: true; room: HillRushRoom | null; players: HillRushPlayer[] }
  | { ok: false; code: string; message?: string };

export type HillRushOption = { id: string; name: string };

const ERRORS: Record<string, string> = {
  not_authenticated: "Sign-in failed. Try again.",
  invalid_nickname: "Use a name up to 16 characters.",
  invalid_code: "Room codes are 4 letters or numbers.",
  invalid_mode: "Pick last alive or chase.",
  invalid_stage: "That hill is not available.",
  invalid_vehicle: "That car is not available.",
  not_found: "No open room with that code.",
  full: "That room already has 4 drivers.",
  not_host: "Only the host can do that.",
  not_lobby: "That room already started.",
  need_players: "Wait for at least one friend.",
  not_racing: "The race is not running.",
  not_hunter: "Only the hunter can tag.",
  not_member: "You are not in this room.",
  not_allowed: "You cannot do that.",
  unknown: "Something went wrong. Try again.",
};

export function hillRushError(code: string | null | undefined, message?: string) {
  if (message && /hillrush_|schema cache|does not exist|PGRST/i.test(message)) {
    return "Multiplayer is not on the server yet. Apply the latest Supabase migration.";
  }
  if (!code) return ERRORS.unknown;
  return ERRORS[code] ?? ERRORS.unknown;
}

export function loadHillRushNick() {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(HILLRUSH_NICK_KEY) ?? "").slice(0, 16);
  } catch {
    return "";
  }
}

export function saveHillRushNick(nickname: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HILLRUSH_NICK_KEY, nickname.trim().slice(0, 16));
  } catch {
    /* ignore */
  }
}

export async function ensureHillRushAuth(supabase: SupabaseClient) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    const msg = error?.message ?? "Could not start a multiplayer session";
    if (msg.includes("Database error creating anonymous user")) {
      throw new Error(
        "Anonymous sign-in is blocked. Apply the allow_anonymous_auth_users migration.",
      );
    }
    throw new Error(msg);
  }
  return data.user.id;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function parseHillRushSnapshot(value: unknown): HillRushSnapshot {
  const row = asRecord(value);
  if (!row || row.ok !== true) {
    return { ok: false, code: asString(row?.code) || "unknown" };
  }
  const room = asRecord(row.room);
  if (!room) return { ok: true, room: null, players: [] };
  const mode = room.mode === "chase" ? "chase" : "survive";
  const status =
    room.status === "racing" || room.status === "done" ? room.status : "lobby";
  const players = Array.isArray(row.players)
    ? row.players.flatMap((entry) => {
        const player = asRecord(entry);
        if (!player || !asString(player.user_id)) return [];
        const role: HillRushRole = player.role === "hunter" ? "hunter" : "runner";
        return [
          {
            userId: asString(player.user_id),
            nickname: asString(player.nickname) || "Driver",
            color: asString(player.color) || "#e8341c",
            role,
            alive: player.alive !== false,
            distance: Number(player.distance) || 0,
            outReason: asString(player.out_reason) || null,
          },
        ];
      })
    : [];

  return {
    ok: true,
    room: {
      id: asString(room.id),
      code: asString(room.code),
      hostId: asString(room.host_id),
      mode,
      stageId: asString(room.stage_id) || "countryside",
      vehicleId: asString(room.vehicle_id) || "jeep",
      status,
      winnerId: asString(room.winner_id) || null,
    },
    players,
  };
}

async function callRoom(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<HillRushSnapshot> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, code: "unknown", message: error.message };
  return parseHillRushSnapshot(data);
}

export function createHillRushRoom(
  supabase: SupabaseClient,
  nickname: string,
  mode: HillRushMode,
  stageId: string,
  vehicleId: string,
) {
  return callRoom(supabase, "hillrush_create_room", {
    p_nickname: nickname,
    p_mode: mode,
    p_stage_id: stageId,
    p_vehicle_id: vehicleId,
  });
}

export function joinHillRushRoom(
  supabase: SupabaseClient,
  code: string,
  nickname: string,
) {
  return callRoom(supabase, "hillrush_join_room", {
    p_code: code,
    p_nickname: nickname,
  });
}

export function setHillRushRoom(
  supabase: SupabaseClient,
  roomId: string,
  mode: HillRushMode,
  stageId: string,
  vehicleId: string,
) {
  return callRoom(supabase, "hillrush_set_room", {
    p_room_id: roomId,
    p_mode: mode,
    p_stage_id: stageId,
    p_vehicle_id: vehicleId,
  });
}

export function startHillRushRoom(supabase: SupabaseClient, roomId: string) {
  return callRoom(supabase, "hillrush_start_room", { p_room_id: roomId });
}

export function hillRushSnapshot(supabase: SupabaseClient, roomId: string) {
  return callRoom(supabase, "hillrush_snapshot", { p_room_id: roomId });
}

export function hillRushDistance(
  supabase: SupabaseClient,
  roomId: string,
  distance: number,
) {
  return callRoom(supabase, "hillrush_distance", {
    p_room_id: roomId,
    p_distance: Math.max(0, Math.floor(distance)),
  });
}

export function hillRushOut(
  supabase: SupabaseClient,
  roomId: string,
  distance: number,
  reason: string,
) {
  return callRoom(supabase, "hillrush_out", {
    p_room_id: roomId,
    p_distance: Math.max(0, Math.floor(distance)),
    p_reason: reason,
  });
}

export function hillRushTag(
  supabase: SupabaseClient,
  roomId: string,
  targetId: string,
  distance: number,
) {
  return callRoom(supabase, "hillrush_tag", {
    p_room_id: roomId,
    p_target: targetId,
    p_distance: Math.max(0, Math.floor(distance)),
  });
}

export function hillRushForfeit(
  supabase: SupabaseClient,
  roomId: string,
  targetId: string,
) {
  return callRoom(supabase, "hillrush_forfeit", {
    p_room_id: roomId,
    p_target: targetId,
  });
}

export function leaveHillRushRoom(supabase: SupabaseClient, roomId: string) {
  return callRoom(supabase, "hillrush_leave_room", { p_room_id: roomId });
}

export function hillRushChannelTopic(roomId: string) {
  return `hillrush:${roomId}`;
}
