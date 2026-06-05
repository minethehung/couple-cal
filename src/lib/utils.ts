import { clsx, type ClassValue } from "clsx";
import { format, isSameMonth, parseISO, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { twMerge } from "tailwind-merge";
import type { Category, CoupleData, Member, Transaction } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(value: number) {
  return vnd.format(Math.round(value));
}

export function shortDate(value: string) {
  return format(parseISO(value), "dd/MM/yyyy", { locale: vi });
}

export function monthLabel(date: Date) {
  return format(date, "MM/yyyy", { locale: vi });
}

export function getFundBalance(transactions: Transaction[]) {
  return transactions.reduce((sum, item) => {
    if (item.type === "expense") return sum - item.amount;
    return sum + item.amount;
  }, 0);
}

export function getMonthlyExpense(transactions: Transaction[], date = new Date()) {
  return transactions
    .filter((item) => item.type === "expense" && isSameMonth(parseISO(item.occurredAt), date))
    .reduce((sum, item) => sum + item.amount, 0);
}

export function getDebtSummary(data: CoupleData) {
  const [a, b] = data.members;
  let owedToA = 0;
  let owedToB = 0;

  data.transactions.forEach((item) => {
    if (item.type !== "expense" || item.split === "none") return;
    const share = item.split === "5050" ? 0.5 : item.splitPayerShare;
    const otherShare = item.amount * (1 - share);
    if (item.paidBy === a.id) owedToA += otherShare;
    if (item.paidBy === b.id) owedToB += otherShare;
  });

  const net = owedToA - owedToB;
  if (Math.abs(net) < 1) return { from: null as Member | null, to: null as Member | null, amount: 0 };
  return net > 0
    ? { from: b, to: a, amount: net }
    : { from: a, to: b, amount: Math.abs(net) };
}

export function getSixMonthStats(transactions: Transaction[]) {
  return Array.from({ length: 6 })
    .map((_, index) => subMonths(new Date(), 5 - index))
    .map((date) => {
      const items = transactions.filter((item) => isSameMonth(parseISO(item.occurredAt), date));
      return {
        month: format(date, "MM", { locale: vi }),
        thu: items.filter((item) => item.type !== "expense").reduce((sum, item) => sum + item.amount, 0),
        chi: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
      };
    });
}

export function getCategoryExpenseStats(transactions: Transaction[], categories: Category[]) {
  return categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({
      name: `${category.emoji} ${category.name}`,
      value: transactions
        .filter((item) => item.type === "expense" && item.categoryId === category.id)
        .reduce((sum, item) => sum + item.amount, 0),
      fill: category.color,
    }))
    .filter((item) => item.value > 0);
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
