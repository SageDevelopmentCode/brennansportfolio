import type { DeliveryFoodStock } from "@/lib/delivery-food";
import {
  MEALS_PER_FEED_PURCHASE,
  parseFoodStock,
} from "@/lib/delivery-food";
import type { DeliveryAnimalId } from "@/lib/delivery-mounts";
import { isDeliveryAnimalId } from "@/lib/delivery-mounts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeliverySkateboard = {
  id: string;
  name: string;
  mount: DeliveryAnimalId;
  createdAt: string;
};

export type DeliveryCompanyState = {
  balance: number;
  ownedMountIds: DeliveryAnimalId[];
  assignedMountIds: DeliveryAnimalId[];
  foodStock: DeliveryFoodStock;
};

export type AddDeliverySkateboardInput = {
  name: string;
  mount: DeliveryAnimalId;
};

export type AddDeliverySkateboardResult =
  | { ok: true; skateboard: DeliverySkateboard }
  | {
      ok: false;
      code:
        | "invalid_name"
        | "invalid_mount"
        | "not_owned"
        | "mount_in_use"
        | "unknown";
    };

export type BuyDeliveryAnimalResult =
  | { ok: true; mountId: DeliveryAnimalId; balance: number }
  | {
      ok: false;
      code:
        | "invalid_mount"
        | "already_owned"
        | "insufficient_funds"
        | "unknown";
    };

export type BuyDeliveryFoodResult =
  | {
      ok: true;
      mountId: DeliveryAnimalId;
      quantity: number;
      balance: number;
    }
  | {
      ok: false;
      code:
        | "invalid_mount"
        | "not_owned"
        | "insufficient_funds"
        | "unknown";
    };

export type CreditDeliveryEarningsResult =
  | { ok: true; balance: number; creditedCount: number }
  | { ok: false; code: "invalid_total" | "unknown" };

type SkateboardRow = {
  id: string;
  name: string;
  mount: string;
  created_at: string;
};

function parseMountIds(value: unknown): DeliveryAnimalId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is DeliveryAnimalId =>
      typeof id === "string" && isDeliveryAnimalId(id),
  );
}

function toSkateboard(row: SkateboardRow): DeliverySkateboard | null {
  if (!isDeliveryAnimalId(row.mount)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    mount: row.mount,
    createdAt: row.created_at,
  };
}

export async function getDeliveryCompanyState(
  supabase: SupabaseClient,
): Promise<DeliveryCompanyState> {
  const { data, error } = await supabase.rpc("delivery_get_company_state");

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    balance?: number;
    owned_mount_ids?: unknown;
    assigned_mount_ids?: unknown;
  };

  return {
    balance: payload.balance ?? 0,
    ownedMountIds: parseMountIds(payload.owned_mount_ids),
    assignedMountIds: parseMountIds(payload.assigned_mount_ids),
    foodStock: parseFoodStock(
      (payload as { food_stock?: unknown }).food_stock,
    ),
  };
}

export async function buyDeliveryFood(
  supabase: SupabaseClient,
  mountId: DeliveryAnimalId,
  quantity = MEALS_PER_FEED_PURCHASE,
): Promise<BuyDeliveryFoodResult> {
  const { data, error } = await supabase.rpc("delivery_buy_food", {
    p_mount: mountId,
    p_qty: quantity,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    mount_id?: string;
    quantity?: number;
    balance?: number;
  };

  if (
    payload?.ok === true &&
    typeof payload.mount_id === "string" &&
    isDeliveryAnimalId(payload.mount_id) &&
    typeof payload.quantity === "number" &&
    typeof payload.balance === "number"
  ) {
    return {
      ok: true,
      mountId: payload.mount_id,
      quantity: payload.quantity,
      balance: payload.balance,
    };
  }

  const code = payload?.code;
  if (code === "invalid_mount") return { ok: false, code: "invalid_mount" };
  if (code === "not_owned") return { ok: false, code: "not_owned" };
  if (code === "insufficient_funds") {
    return { ok: false, code: "insufficient_funds" };
  }

  return { ok: false, code: "unknown" };
}

export async function consumeDeliveryFood(
  supabase: SupabaseClient,
  mountId: DeliveryAnimalId,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("delivery_consume_food", {
    p_mount: mountId,
  });

  if (error) {
    throw error;
  }

  const payload = data as { ok?: boolean };
  return payload?.ok === true;
}

export async function buyDeliveryAnimal(
  supabase: SupabaseClient,
  mountId: DeliveryAnimalId,
): Promise<BuyDeliveryAnimalResult> {
  const { data, error } = await supabase.rpc("delivery_buy_animal", {
    p_mount: mountId,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    mount_id?: string;
    balance?: number;
  };

  if (
    payload?.ok === true &&
    typeof payload.mount_id === "string" &&
    isDeliveryAnimalId(payload.mount_id) &&
    typeof payload.balance === "number"
  ) {
    return {
      ok: true,
      mountId: payload.mount_id,
      balance: payload.balance,
    };
  }

  const code = payload?.code;
  if (code === "invalid_mount") return { ok: false, code: "invalid_mount" };
  if (code === "already_owned") return { ok: false, code: "already_owned" };
  if (code === "insufficient_funds") {
    return { ok: false, code: "insufficient_funds" };
  }

  return { ok: false, code: "unknown" };
}

export async function listDeliverySkateboards(
  supabase: SupabaseClient,
): Promise<DeliverySkateboard[]> {
  const { data, error } = await supabase
    .from("delivery_skateboards")
    .select("id, name, mount, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => toSkateboard(row as SkateboardRow))
    .filter((row): row is DeliverySkateboard => row !== null);
}

export async function addDeliverySkateboard(
  supabase: SupabaseClient,
  input: AddDeliverySkateboardInput,
): Promise<AddDeliverySkateboardResult> {
  const { data, error } = await supabase.rpc("delivery_add_skateboard", {
    p_name: input.name,
    p_mount: input.mount,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    skateboard?: SkateboardRow;
  };

  if (payload?.ok === true && payload.skateboard) {
    const skateboard = toSkateboard(payload.skateboard);
    if (skateboard) {
      return { ok: true, skateboard };
    }
  }

  const code = payload?.code;
  if (code === "invalid_name") return { ok: false, code: "invalid_name" };
  if (code === "invalid_mount") return { ok: false, code: "invalid_mount" };
  if (code === "not_owned") return { ok: false, code: "not_owned" };
  if (code === "mount_in_use") return { ok: false, code: "mount_in_use" };

  return { ok: false, code: "unknown" };
}

export async function creditDeliveryEarnings(
  supabase: SupabaseClient,
  sourceIds: string[],
  totalEarned: number,
): Promise<CreditDeliveryEarningsResult> {
  if (sourceIds.length === 0) {
    const state = await getDeliveryCompanyState(supabase);
    return { ok: true, balance: state.balance, creditedCount: 0 };
  }

  const { data, error } = await supabase.rpc("delivery_credit_deliveries", {
    p_source_ids: sourceIds,
    p_total: totalEarned,
  });

  if (error) {
    throw error;
  }

  const payload = data as {
    ok?: boolean;
    code?: string;
    balance?: number;
    credited_count?: number;
  };

  if (payload?.ok === true && typeof payload.balance === "number") {
    return {
      ok: true,
      balance: payload.balance,
      creditedCount: payload.credited_count ?? 0,
    };
  }

  if (payload?.code === "invalid_total") {
    return { ok: false, code: "invalid_total" };
  }

  return { ok: false, code: "unknown" };
}
