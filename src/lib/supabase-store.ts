"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CoupleData } from "./types";

const TABLE_NAME = "couple_cal_state";
const ROW_ID = "default";

type StateRow = {
  id: string;
  data: CoupleData;
  updated_at: string;
};

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

function getClient() {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    cachedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    );
  }
  return cachedClient;
}

export async function loadSupabaseData() {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from(TABLE_NAME)
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle<Pick<StateRow, "data">>();

  if (error) throw error;
  return data?.data ?? null;
}

export async function saveSupabaseData(data: CoupleData) {
  const client = getClient();
  if (!client) return;

  const { error } = await client.from(TABLE_NAME).upsert({
    id: ROW_ID,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function seedSupabaseData(data: CoupleData) {
  const existing = await loadSupabaseData();
  if (!existing) await saveSupabaseData(data);
  return existing ?? data;
}
