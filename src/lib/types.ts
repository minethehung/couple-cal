export type Member = {
  id: string;
  name: string;
  color: string;
  emoji: string;
};

export type Settings = {
  coupleName: string;
  anniversaryDate: string;
  pin: string;
  fundTarget: number;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  kind: "expense" | "income";
  color: string;
};

export type EventItem = {
  id: string;
  title: string;
  note: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  calendarType: "shared" | "private";
  ownerId: string | null;
  color: string;
  location: string;
};

export type Transaction = {
  id: string;
  amount: number;
  type: "expense" | "income" | "deposit";
  categoryId: string | null;
  paidBy: string;
  note: string;
  occurredAt: string;
  split: "none" | "5050" | "custom";
  splitPayerShare: number;
};

export type CoupleData = {
  members: [Member, Member];
  settings: Settings;
  categories: Category[];
  events: EventItem[];
  transactions: Transaction[];
};
