import type { SupabaseClient } from "@supabase/supabase-js";

export type ShelterPet = {
  id: string;
  name: string;
  species: string;
  description: string;
  emoji: string;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
};

export type ShelterAdoptionResult =
  | { ok: true; petName: string }
  | {
      ok: false;
      code:
        | "unavailable"
        | "not_found"
        | "invalid_name"
        | "invalid_signature"
        | "unknown";
    };

export type ShelterAddListingInput = {
  name: string;
  type: string;
  description: string;
  emoji: string;
  imageUrl: string;
};

export type ShelterAddListingResult =
  | { ok: true; pet: ShelterPet }
  | {
      ok: false;
      code:
        | "duplicate_name"
        | "invalid_name"
        | "invalid_type"
        | "invalid_image"
        | "unknown";
    };

export type ShelterUpdateListingInput = {
  petId: string;
  name: string;
  type: string;
  description: string;
  emoji: string;
  imageUrl: string;
};

export type ShelterUpdateListingResult =
  | { ok: true; pet: ShelterPet }
  | {
      ok: false;
      code:
        | "not_found"
        | "duplicate_name"
        | "invalid_name"
        | "invalid_type"
        | "invalid_image"
        | "unknown";
    };

type PetRow = {
  id: string;
  name: string;
  species: string;
  description: string;
  emoji: string;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
};

function toPet(row: PetRow): ShelterPet {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    description: row.description,
    emoji: row.emoji,
    imageUrl: row.image_url ?? null,
    isAvailable: row.is_available,
    createdAt: row.created_at,
  };
}

/** Normalize and validate a public image URL from the web. */
export function parseShelterImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function getShelterPets(
  supabase: SupabaseClient,
): Promise<ShelterPet[]> {
  const { data, error } = await supabase
    .from("shelter_pets")
    .select(
      "id, name, species, description, emoji, image_url, is_available, created_at",
    )
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toPet);
}

export async function completeShelterAdoption(
  supabase: SupabaseClient,
  petId: string,
  visitorName: string,
  signaturePng: string,
): Promise<ShelterAdoptionResult> {
  const { data, error } = await supabase.rpc("shelter_complete_adoption", {
    p_pet_id: petId,
    p_visitor_name: visitorName,
    p_signature_png: signaturePng,
  });

  if (error) {
    throw error;
  }

  const payload = data as { ok?: boolean; code?: string; pet_name?: string };

  if (payload?.ok === true && payload.pet_name) {
    return { ok: true, petName: payload.pet_name };
  }

  const code = payload?.code;
  if (
    code === "unavailable" ||
    code === "not_found" ||
    code === "invalid_name" ||
    code === "invalid_signature"
  ) {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export async function addShelterListing(
  supabase: SupabaseClient,
  input: ShelterAddListingInput,
): Promise<ShelterAddListingResult> {
  const imageUrl = parseShelterImageUrl(input.imageUrl);
  if (!imageUrl) {
    return { ok: false, code: "invalid_image" };
  }

  const { data, error } = await supabase.rpc("shelter_add_listing", {
    p_name: input.name,
    p_species: input.type,
    p_description: input.description,
    p_emoji: input.emoji,
    p_image_url: imageUrl,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    pet?: PetRow;
  };

  if (payload?.ok === true && payload.pet) {
    return { ok: true, pet: toPet(payload.pet) };
  }

  const code = payload?.code;
  if (
    code === "duplicate_name" ||
    code === "invalid_name" ||
    code === "invalid_type" ||
    code === "invalid_image"
  ) {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export async function updateShelterListing(
  supabase: SupabaseClient,
  input: ShelterUpdateListingInput,
): Promise<ShelterUpdateListingResult> {
  const imageUrl = parseShelterImageUrl(input.imageUrl);
  if (!imageUrl) {
    return { ok: false, code: "invalid_image" };
  }

  const { data, error } = await supabase.rpc("shelter_update_listing", {
    p_pet_id: input.petId,
    p_name: input.name,
    p_species: input.type,
    p_description: input.description,
    p_emoji: input.emoji,
    p_image_url: imageUrl,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    pet?: PetRow;
  };

  if (payload?.ok === true && payload.pet) {
    return { ok: true, pet: toPet(payload.pet) };
  }

  const code = payload?.code;
  if (
    code === "not_found" ||
    code === "duplicate_name" ||
    code === "invalid_name" ||
    code === "invalid_type" ||
    code === "invalid_image"
  ) {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export type ShelterRequestStatus = "pending" | "approved" | "denied";

export type ShelterAdoptionRequest = {
  id: string;
  petId: string;
  visitorName: string;
  status: ShelterRequestStatus;
  createdAt: string;
  pet: ShelterPet | null;
};

export type SubmitAdoptionRequestResult =
  | { ok: true; requestId: string; petName: string }
  | {
      ok: false;
      code:
        | "unavailable"
        | "not_found"
        | "invalid_name"
        | "invalid_signature"
        | "already_pending"
        | "unknown";
    };

export type DecideAdoptionRequestResult =
  | { ok: true; status: "approved" | "denied"; petName: string }
  | { ok: false; code: "not_found" | "not_pending" | "unknown" };

type RequestRow = {
  id: string;
  pet_id: string;
  visitor_name: string;
  signature_png: string;
  status: ShelterRequestStatus;
  created_at: string;
  decided_at: string | null;
  shelter_pets: PetRow | PetRow[] | null;
};

function toRequest(row: RequestRow): ShelterAdoptionRequest {
  const petRaw = row.shelter_pets;
  const petRow = Array.isArray(petRaw) ? petRaw[0] : petRaw;
  return {
    id: row.id,
    petId: row.pet_id,
    visitorName: row.visitor_name,
    status: row.status,
    createdAt: row.created_at,
    pet: petRow ? toPet(petRow) : null,
  };
}

export async function submitShelterAdoptionRequest(
  supabase: SupabaseClient,
  petId: string,
  visitorName: string,
  signaturePng: string,
): Promise<SubmitAdoptionRequestResult> {
  const { data, error } = await supabase.rpc("shelter_submit_adoption_request", {
    p_pet_id: petId,
    p_visitor_name: visitorName,
    p_signature_png: signaturePng,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    request_id?: string;
    pet_name?: string;
  };

  if (payload?.ok && payload.request_id && payload.pet_name) {
    return {
      ok: true,
      requestId: payload.request_id,
      petName: payload.pet_name,
    };
  }

  const code = payload?.code;
  if (
    code === "unavailable" ||
    code === "not_found" ||
    code === "invalid_name" ||
    code === "invalid_signature" ||
    code === "already_pending"
  ) {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export async function getPendingShelterRequests(
  supabase: SupabaseClient,
): Promise<ShelterAdoptionRequest[]> {
  const { data, error } = await supabase
    .from("shelter_adoption_requests")
    .select(
      "id, pet_id, visitor_name, signature_png, status, created_at, decided_at, shelter_pets(id, name, species, description, emoji, image_url, is_available, created_at)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toRequest(row as RequestRow));
}

export async function decideShelterAdoptionRequest(
  supabase: SupabaseClient,
  requestId: string,
  approve: boolean,
): Promise<DecideAdoptionRequestResult> {
  const { data, error } = await supabase.rpc("shelter_decide_adoption_request", {
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
    pet_name?: string;
  };

  if (payload?.ok && payload.status && payload.pet_name) {
    return {
      ok: true,
      status: payload.status,
      petName: payload.pet_name,
    };
  }

  const code = payload?.code;
  if (code === "not_found" || code === "not_pending") {
    return { ok: false, code };
  }

  return { ok: false, code: "unknown" };
}

export async function getShelterAdoptionRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ShelterAdoptionRequest | null> {
  const { data, error } = await supabase
    .from("shelter_adoption_requests")
    .select(
      "id, pet_id, visitor_name, signature_png, status, created_at, decided_at, shelter_pets(id, name, species, description, emoji, image_url, is_available, created_at)",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return toRequest(data as RequestRow);
}
