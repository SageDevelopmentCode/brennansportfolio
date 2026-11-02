import type { SupabaseClient } from "@supabase/supabase-js";

export type GymRequestStatus = "pending" | "approved" | "denied";

export type GymCheckInChild = {
  id: string;
  name: string;
  age: number;
  height: string;
  size: string;
  favoriteFood: string;
  ejectedAt: string | null;
};

export function isChildOnFloor(child: GymCheckInChild): boolean {
  return child.ejectedAt === null;
}

export type MutateGymChildResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_child" | "not_found" | "not_approved" | "unknown";
    };

export type AddGymChildResult =
  | { ok: true; childId: string }
  | {
      ok: false;
      code: "invalid_child" | "not_found" | "not_approved" | "unknown";
    };

export type GymCheckInChildInput = Omit<GymCheckInChild, "id" | "ejectedAt">;

export type GymCheckInRequest = {
  id: string;
  familyName: string;
  memberSummary: string;
  notes: string | null;
  status: GymRequestStatus;
  lobbyCode: string | null;
  familyCode: string | null;
  children: GymCheckInChild[];
  createdAt: string;
  decidedAt: string | null;
};

export type SubmitGymFamilyCodeResult =
  | { ok: true; familyCode: string; familyName: string }
  | {
      ok: false;
      code:
        | "invalid_format"
        | "not_found"
        | "not_approved"
        | "already_set"
        | "taken"
        | "unknown";
    };

export type SubmitGymCheckInResult =
  | { ok: true; requestId: string; familyName: string; lobbyCode: string }
  | {
      ok: false;
      code: "invalid_family" | "invalid_members" | "invalid_child" | "unknown";
    };

export type DecideGymCheckInResult =
  | { ok: true; status: "approved" | "denied"; familyName: string }
  | { ok: false; code: "not_found" | "not_pending" | "unknown" };

const CHILDREN_EMBED =
  "gym_check_in_children (id, name, age, height, size, favorite_food, ejected_at)";

const CHECK_IN_SELECT = `id, family_name, member_summary, notes, status, lobby_code, family_code, created_at, decided_at, ${CHILDREN_EMBED}`;

type ChildRow = {
  id: string;
  name: string;
  age: number;
  height: string;
  size: string;
  favorite_food: string;
  ejected_at: string | null;
};

type CheckInRow = {
  id: string;
  family_name: string;
  member_summary: string;
  notes: string | null;
  status: GymRequestStatus;
  lobby_code: string | null;
  family_code: string | null;
  created_at: string;
  decided_at: string | null;
  gym_check_in_children?: ChildRow[] | null;
};

function toChild(row: ChildRow): GymCheckInChild {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    height: row.height,
    size: row.size,
    favoriteFood: row.favorite_food,
    ejectedAt: row.ejected_at,
  };
}

function toCheckIn(row: CheckInRow): GymCheckInRequest {
  const children = (row.gym_check_in_children ?? [])
    .map((c) => toChild(c))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: row.id,
    familyName: row.family_name,
    memberSummary: row.member_summary,
    notes: row.notes,
    status: row.status,
    lobbyCode: row.lobby_code,
    familyCode: row.family_code,
    children,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

function childToRpcPayload(child: GymCheckInChildInput) {
  return {
    name: child.name.trim(),
    age: child.age,
    height: child.height.trim(),
    size: child.size.trim(),
    favorite_food: child.favoriteFood.trim(),
  };
}

function childrenToRpcPayload(children: GymCheckInChildInput[]) {
  return children.map((child) => childToRpcPayload(child));
}

export async function addGymCheckInChild(
  supabase: SupabaseClient,
  requestId: string,
  child: GymCheckInChildInput,
): Promise<AddGymChildResult> {
  const { data, error } = await supabase.rpc("gym_add_check_in_child", {
    p_request_id: requestId,
    p_child: childToRpcPayload(child),
  });

  if (error) throw error;

  const payload = data as { ok?: boolean; code?: string; child_id?: string };
  if (payload?.ok && payload.child_id) {
    return { ok: true, childId: payload.child_id };
  }

  const code = payload?.code;
  if (code === "invalid_child" || code === "not_found" || code === "not_approved") {
    return { ok: false, code };
  }
  return { ok: false, code: "unknown" };
}

export async function updateGymCheckInChild(
  supabase: SupabaseClient,
  childId: string,
  child: GymCheckInChildInput,
): Promise<MutateGymChildResult> {
  const { data, error } = await supabase.rpc("gym_update_check_in_child", {
    p_child_id: childId,
    p_child: childToRpcPayload(child),
  });

  if (error) throw error;

  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return { ok: true };

  const code = payload?.code;
  if (code === "invalid_child" || code === "not_found") {
    return { ok: false, code };
  }
  return { ok: false, code: "unknown" };
}

export async function ejectGymCheckInChild(
  supabase: SupabaseClient,
  childId: string,
): Promise<MutateGymChildResult> {
  const { data, error } = await supabase.rpc("gym_eject_check_in_child", {
    p_child_id: childId,
  });

  if (error) throw error;

  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return { ok: true };

  if (payload?.code === "not_found") {
    return { ok: false, code: "not_found" };
  }
  return { ok: false, code: "unknown" };
}

export async function submitGymCheckIn(
  supabase: SupabaseClient,
  familyName: string,
  memberSummary: string,
  notes?: string,
  children: GymCheckInChildInput[] = [],
): Promise<SubmitGymCheckInResult> {
  const { data, error } = await supabase.rpc("gym_submit_check_in", {
    p_family_name: familyName,
    p_member_summary: memberSummary,
    p_notes: notes ?? null,
    p_children: childrenToRpcPayload(children),
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    request_id?: string;
    family_name?: string;
    lobby_code?: string;
  };

  if (
    payload?.ok &&
    payload.request_id &&
    payload.family_name &&
    payload.lobby_code
  ) {
    return {
      ok: true,
      requestId: payload.request_id,
      familyName: payload.family_name,
      lobbyCode: payload.lobby_code,
    };
  }

  const code = payload?.code;
  if (
    code === "invalid_family" ||
    code === "invalid_members" ||
    code === "invalid_child"
  ) {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export async function getPendingGymCheckIns(
  supabase: SupabaseClient,
): Promise<GymCheckInRequest[]> {
  const { data, error } = await supabase
    .from("gym_check_in_requests")
    .select(CHECK_IN_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toCheckIn(row as CheckInRow));
}

export async function decideGymCheckIn(
  supabase: SupabaseClient,
  requestId: string,
  approve: boolean,
): Promise<DecideGymCheckInResult> {
  const { data, error } = await supabase.rpc("gym_decide_check_in", {
    p_request_id: requestId,
    p_approve: approve,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    status?: "approved" | "denied";
    family_name?: string;
  };

  if (payload?.ok && payload.status && payload.family_name) {
    return {
      ok: true,
      status: payload.status,
      familyName: payload.family_name,
    };
  }

  const code = payload?.code;
  if (code === "not_found" || code === "not_pending") {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export async function getGymCheckIn(
  supabase: SupabaseClient,
  requestId: string,
): Promise<GymCheckInRequest | null> {
  const { data, error } = await supabase
    .from("gym_check_in_requests")
    .select(CHECK_IN_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return toCheckIn(data as CheckInRow);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DIGIT_LETTER_CODE_RE = /^[0-9][a-zA-Z]$/;

/** Normalize digit+letter input to stored form (digit + uppercase letter). */
export function normalizeGymDigitLetterCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!DIGIT_LETTER_CODE_RE.test(trimmed)) return null;
  return trimmed[0] + trimmed[1].toUpperCase();
}

export function normalizeGymLobbyCode(raw: string): string | null {
  return normalizeGymDigitLetterCode(raw);
}

export function normalizeGymFamilyCode(raw: string): string | null {
  return normalizeGymDigitLetterCode(raw);
}

export async function getGymCheckInRoster(
  supabase: SupabaseClient,
): Promise<GymCheckInRequest[]> {
  const { data, error } = await supabase
    .from("gym_check_in_requests")
    .select(CHECK_IN_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toCheckIn(row as CheckInRow));
}

export async function submitGymFamilyCode(
  supabase: SupabaseClient,
  requestId: string,
  rawCode: string,
): Promise<SubmitGymFamilyCodeResult> {
  const normalized = normalizeGymFamilyCode(rawCode);
  if (!normalized) {
    return { ok: false, code: "invalid_format" };
  }

  const { data, error } = await supabase.rpc("gym_submit_family_code", {
    p_request_id: requestId,
    p_family_code: normalized,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    family_code?: string;
    family_name?: string;
  };

  if (payload?.ok && payload.family_code && payload.family_name) {
    return {
      ok: true,
      familyCode: payload.family_code,
      familyName: payload.family_name,
    };
  }

  const code = payload?.code;
  if (
    code === "invalid_format" ||
    code === "not_found" ||
    code === "not_approved" ||
    code === "already_set" ||
    code === "taken"
  ) {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export function parseGymRequestLookup(raw: string): {
  kind: "uuid";
  id: string;
} | {
  kind: "lobby";
  lobbyCode: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (UUID_RE.test(trimmed)) {
    return { kind: "uuid", id: trimmed };
  }

  const lobbyCode = normalizeGymLobbyCode(trimmed);
  if (lobbyCode) {
    return { kind: "lobby", lobbyCode };
  }

  return null;
}

export async function findGymCheckInByLookup(
  supabase: SupabaseClient,
  raw: string,
): Promise<GymCheckInRequest | null> {
  const lookup = parseGymRequestLookup(raw);
  if (!lookup) return null;

  if (lookup.kind === "uuid") {
    return getGymCheckIn(supabase, lookup.id);
  }

  const pending = await supabase
    .from("gym_check_in_requests")
    .select(CHECK_IN_SELECT)
    .eq("lobby_code", lookup.lobbyCode)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending.error) {
    throw pending.error;
  }

  if (pending.data) {
    return toCheckIn(pending.data as CheckInRow);
  }

  const approved = await supabase
    .from("gym_check_in_requests")
    .select(CHECK_IN_SELECT)
    .eq("lobby_code", lookup.lobbyCode)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approved.error) {
    throw approved.error;
  }

  if (!approved.data) return null;
  return toCheckIn(approved.data as CheckInRow);
}
