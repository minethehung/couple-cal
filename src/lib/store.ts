"use client";

import { addDays, formatISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, seedSupabaseData, saveSupabaseData } from "./supabase-store";
import type { CoupleData } from "./types";

const STORAGE_KEY = "couple-cal:data:v1";
const USER_KEY = "couple-cal:user:v1";
const PIN_KEY = "couple-cal:pin-ok:v1";
const DEFAULT_PIN = (process.env.NEXT_PUBLIC_COUPLE_CAL_PIN ?? "").replace(/\D/g, "").slice(0, 4);

const today = startOfDay(new Date());

export const sampleData: CoupleData = {
  members: [
    { id: "m1", name: "Mèo Hồng", color: "#ff8fb3", emoji: "🌷" },
    { id: "m2", name: "Gấu Mint", color: "#4cc6a0", emoji: "🍀" },
  ],
  settings: {
    coupleName: "Nhà mình",
    anniversaryDate: "2023-02-14",
    pin: DEFAULT_PIN,
    fundTarget: 12000000,
  },
  categories: [
    { id: "food", name: "Ăn uống", emoji: "🍜", kind: "expense", color: "#f25c8a" },
    { id: "date", name: "Hẹn hò", emoji: "🎬", kind: "expense", color: "#a98ee6" },
    { id: "home", name: "Nhà cửa", emoji: "🏡", kind: "expense", color: "#5ba8f0" },
    { id: "gift", name: "Quà", emoji: "🎁", kind: "expense", color: "#f2b705" },
    { id: "salary", name: "Thu nhập", emoji: "💌", kind: "income", color: "#4cc6a0" },
  ],
  events: [
    {
      id: "event-1",
      title: "Ăn tối cuối tuần",
      note: "Nhớ đặt bàn cạnh cửa sổ.",
      startAt: formatISO(addDays(today, 2)),
      endAt: formatISO(addDays(today, 2)),
      allDay: false,
      calendarType: "shared",
      ownerId: null,
      color: "#ff8fb3",
      location: "Quận 1",
    },
    {
      id: "event-2",
      title: "Mua quà kỷ niệm",
      note: "",
      startAt: formatISO(addDays(today, 5)),
      endAt: formatISO(addDays(today, 5)),
      allDay: true,
      calendarType: "private",
      ownerId: "m1",
      color: "#a98ee6",
      location: "",
    },
  ],
  transactions: [
    {
      id: "tx-1",
      amount: 2000000,
      type: "deposit",
      categoryId: null,
      paidBy: "m1",
      note: "Nạp quỹ tháng này",
      occurredAt: formatISO(today),
      split: "none",
      splitPayerShare: 1,
    },
    {
      id: "tx-2",
      amount: 680000,
      type: "expense",
      categoryId: "food",
      paidBy: "m2",
      note: "Lẩu và trà sữa",
      occurredAt: formatISO(addDays(today, -3)),
      split: "5050",
      splitPayerShare: 0.5,
    },
  ],
};

function readData() {
  if (typeof window === "undefined") return sampleData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return sampleData;
  try {
    return JSON.parse(raw) as CoupleData;
  } catch {
    return sampleData;
  }
}

export function useCoupleStore() {
  const [data, setData] = useState<CoupleData>(sampleData);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Đang tải dữ liệu...");
  const [currentMemberId, setCurrentMemberIdState] = useState<string | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = readData();
      let next = local;

      if (isSupabaseConfigured()) {
        try {
          next = await seedSupabaseData(local);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setSyncStatus("Supabase");
        } catch (error) {
          console.error(error);
          setSyncStatus("Supabase lỗi, đang dùng LocalStorage");
        }
      } else {
        setSyncStatus("LocalStorage");
      }

      if (cancelled) return;
      setData(next);
      setCurrentMemberIdState(window.localStorage.getItem(USER_KEY));
      setPinUnlocked(window.localStorage.getItem(PIN_KEY) === "yes" || !next.settings.pin);
      setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (isSupabaseConfigured()) {
      saveSupabaseData(data)
        .then(() => setSyncStatus("Supabase"))
        .catch((error) => {
          console.error(error);
          setSyncStatus("Supabase lỗi, đang dùng LocalStorage");
        });
    }
  }, [data, ready]);

  const currentMember = useMemo(
    () => data.members.find((member) => member.id === currentMemberId) ?? null,
    [currentMemberId, data.members],
  );

  const setCurrentMemberId = (id: string | null) => {
    setCurrentMemberIdState(id);
    if (id) window.localStorage.setItem(USER_KEY, id);
    else window.localStorage.removeItem(USER_KEY);
  };

  const unlockPin = () => {
    setPinUnlocked(true);
    window.localStorage.setItem(PIN_KEY, "yes");
  };

  const resetPinUnlock = () => {
    setPinUnlocked(!data.settings.pin);
    window.localStorage.removeItem(PIN_KEY);
  };

  return {
    data,
    setData,
    ready,
    currentMember,
    currentMemberId,
    setCurrentMemberId,
    pinUnlocked,
    unlockPin,
    resetPinUnlock,
    syncMode: syncStatus,
  };
}
