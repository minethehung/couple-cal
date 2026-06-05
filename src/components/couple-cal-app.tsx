"use client";

import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  Pencil,
  PiggyBank,
  Plus,
  Settings,
  Trash2,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, CoupleData, EventItem, Member, Transaction } from "@/lib/types";
import { sampleData, useCoupleStore } from "@/lib/store";
import {
  cn,
  createId,
  formatVnd,
  getCategoryExpenseStats,
  getDebtSummary,
  getFundBalance,
  getMonthlyExpense,
  getSixMonthStats,
  shortDate,
} from "@/lib/utils";

type RouteKey = "home" | "calendar" | "expenses" | "settings";
type FilterKey = "all" | "shared" | string;

const nav = [
  { key: "home", href: "/", label: "Trang chủ", icon: Home },
  { key: "calendar", href: "/calendar", label: "Lịch", icon: CalendarDays },
  { key: "expenses", href: "/expenses", label: "Chi tiêu", icon: WalletCards },
  { key: "settings", href: "/settings", label: "Cài đặt", icon: Settings },
] as const;

type Store = ReturnType<typeof useCoupleStore>;
type DebtSummary = ReturnType<typeof getDebtSummary>;

const emptyEvent = (): EventItem => ({
  id: "",
  title: "",
  note: "",
  startAt: formatISO(new Date()),
  endAt: formatISO(new Date()),
  allDay: true,
  calendarType: "shared",
  ownerId: null,
  color: "#ff8fb3",
  location: "",
});

const emptyTx = (memberId: string): Transaction => ({
  id: "",
  amount: 0,
  type: "expense",
  categoryId: sampleData.categories[0]?.id ?? null,
  paidBy: memberId,
  note: "",
  occurredAt: formatISO(new Date()),
  split: "5050",
  splitPayerShare: 0.5,
});

export default function CoupleCalApp({ route }: { route: RouteKey }) {
  const store = useCoupleStore();
  const { data, setData, currentMember, ready } = store;
  const [eventModal, setEventModal] = useState<EventItem | null>(null);
  const [txModal, setTxModal] = useState<Transaction | null>(null);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#fff7fb] text-[#5b4a55]">Đang mở sổ yêu thương...</div>;
  if (!store.pinUnlocked) return <PinGate pin={data.settings.pin} onUnlock={store.unlockPin} />;
  if (!currentMember) {
    return (
      <MemberGate
        data={data}
        onPick={(id) => store.setCurrentMemberId(id)}
      />
    );
  }

  const debt = getDebtSummary(data);
  const balance = getFundBalance(data.transactions);
  const monthlyExpense = getMonthlyExpense(data.transactions);
  const upcoming = data.events
    .filter((event) => parseISO(event.startAt) >= startOfDay(new Date()))
    .sort((a, b) => +parseISO(a.startAt) - +parseISO(b.startAt))
    .slice(0, 5);

  const saveEvent = (item: EventItem) => {
    const next = { ...item, id: item.id || createId("event") };
    setData((prev) => ({
      ...prev,
      events: prev.events.some((event) => event.id === next.id)
        ? prev.events.map((event) => (event.id === next.id ? next : event))
        : [next, ...prev.events],
    }));
    setEventModal(null);
  };

  const deleteEvent = (id: string) => {
    setData((prev) => ({ ...prev, events: prev.events.filter((event) => event.id !== id) }));
    setEventModal(null);
  };

  const saveTx = (item: Transaction) => {
    const next = { ...item, amount: Math.max(0, Number(item.amount)), id: item.id || createId("tx") };
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.some((tx) => tx.id === next.id)
        ? prev.transactions.map((tx) => (tx.id === next.id ? next : tx))
        : [next, ...prev.transactions],
    }));
    setTxModal(null);
  };

  const deleteTx = (id: string) => {
    setData((prev) => ({ ...prev, transactions: prev.transactions.filter((tx) => tx.id !== id) }));
    setTxModal(null);
  };

  return (
    <div className="min-h-screen bg-[#fff7fb] text-[#5b4a55]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 p-5 lg:block">
          <div className="flex h-full flex-col rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-[0_18px_50px_rgba(242,92,138,0.13)] backdrop-blur">
            <Brand name={data.settings.coupleName} />
            <nav className="mt-8 space-y-2">
              {nav.map((item) => (
                <NavLink key={item.key} item={item} active={route === item.key} />
              ))}
            </nav>
            <button
              onClick={() => store.setCurrentMemberId(null)}
              className="mt-auto flex items-center gap-3 rounded-3xl bg-[#fff0f6] p-3 text-left text-sm font-bold text-[#f25c8a]"
            >
              <Avatar emoji={currentMember.emoji} color={currentMember.color} />
              Đổi người
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-8 lg:pl-2 lg:pr-6">
          <header className="mb-5 flex items-center justify-between gap-3 lg:hidden">
            <Brand name={data.settings.coupleName} compact />
            <button onClick={() => store.setCurrentMemberId(null)} className="rounded-full bg-white px-3 py-2 text-sm font-bold shadow-soft">
              {currentMember.emoji} Đổi
            </button>
          </header>

          {route === "home" && (
            <HomeView
              data={data}
              memberId={currentMember.id}
              balance={balance}
              monthlyExpense={monthlyExpense}
              debt={debt}
              upcoming={upcoming}
              onEditEvent={setEventModal}
            />
          )}
          {route === "calendar" && (
            <CalendarView
              data={data}
              onAdd={() => setEventModal(emptyEvent())}
              onEdit={setEventModal}
            />
          )}
          {route === "expenses" && (
            <ExpensesView
              data={data}
              balance={balance}
              monthlyExpense={monthlyExpense}
              debt={debt}
              onAdd={() => setTxModal(emptyTx(currentMember.id))}
              onEdit={setTxModal}
            />
          )}
          {route === "settings" && <SettingsView store={store} />}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-[1.7rem] border border-white/80 bg-white/90 p-2 shadow-[0_12px_40px_rgba(91,74,85,0.16)] backdrop-blur lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold text-[#9a8b94]",
                route === item.key && "bg-[#ffe1ed] text-[#f25c8a]",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {eventModal && (
        <EventModal
          key={eventModal.id || "new-event"}
          event={eventModal}
          data={data}
          onClose={() => setEventModal(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}
      {txModal && (
        <TransactionModal
          key={txModal.id || "new-tx"}
          tx={txModal}
          data={data}
          onClose={() => setTxModal(null)}
          onSave={saveTx}
          onDelete={deleteTx}
        />
      )}
    </div>
  );
}

function PinGate({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#fff7fb,#f1fff9)] p-5 text-[#5b4a55]">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="mb-5 text-center text-5xl">💘</div>
        <h1 className="text-center text-2xl font-black">Cổng PIN chung</h1>
        <p className="mt-2 text-center text-sm font-semibold text-[#9a8b94]">Nhập 4 số để mở couple-cal.</p>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
          className="mt-6 w-full rounded-3xl border border-[#ffd5e5] bg-[#fff7fb] px-5 py-4 text-center text-3xl font-black tracking-[0.5em] outline-none"
          inputMode="numeric"
          autoFocus
        />
        {error && <p className="mt-3 text-center text-sm font-bold text-[#f25c8a]">{error}</p>}
        <button
          className="mt-5 w-full rounded-3xl bg-[#f25c8a] px-5 py-4 font-black text-white shadow-pink"
          onClick={() => (value === pin ? onUnlock() : setError("PIN chưa đúng nè."))}
        >
          Mở app
        </button>
      </motion.div>
    </div>
  );
}

function MemberGate({ data, onPick }: { data: CoupleData; onPick: (id: string) => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#fff7fb,#f7f1ff)] p-5 text-[#5b4a55]">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-soft">
        <p className="text-center text-sm font-black uppercase tracking-widest text-[#f25c8a]">{data.settings.coupleName}</p>
        <h1 className="mt-2 text-center text-3xl font-black">Bạn là ai?</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {data.members.map((member) => (
            <button
              key={member.id}
              onClick={() => onPick(member.id)}
              className="rounded-[2rem] border border-white bg-[#fff7fb] p-5 text-center shadow-soft transition hover:-translate-y-0.5"
            >
              <div className="mx-auto grid size-20 place-items-center rounded-full text-4xl" style={{ background: `${member.color}33` }}>
                {member.emoji}
              </div>
              <div className="mt-3 text-lg font-black">{member.name}</div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function Brand({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-3xl bg-[#ffe1ed] text-2xl shadow-pink">💞</div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#f25c8a]">couple-cal</p>
        {!compact && <h1 className="text-xl font-black">{name}</h1>}
      </div>
    </div>
  );
}

function NavLink({ item, active }: { item: (typeof nav)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn("flex items-center gap-3 rounded-3xl px-4 py-3 font-black text-[#9a8b94]", active && "bg-[#ffe1ed] text-[#f25c8a] shadow-pink")}
    >
      <Icon size={20} />
      {item.label}
    </Link>
  );
}

function Avatar({ emoji, color }: { emoji: string; color: string }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-full text-xl" style={{ background: `${color}33` }}>{emoji}</span>;
}

function HomeView({
  data,
  memberId,
  balance,
  monthlyExpense,
  debt,
  upcoming,
  onEditEvent,
}: {
  data: CoupleData;
  memberId: string;
  balance: number;
  monthlyExpense: number;
  debt: DebtSummary;
  upcoming: EventItem[];
  onEditEvent: (event: EventItem) => void;
}) {
  const member = data.members.find((item) => item.id === memberId);
  const days = Math.max(0, differenceInCalendarDays(new Date(), parseISO(data.settings.anniversaryDate)));
  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="text-sm font-bold text-[#9a8b94]">Xin chào {member?.emoji}</p>
        <h2 className="text-3xl font-black sm:text-4xl">Hôm nay mình thương nhau thêm một chút, {member?.name}.</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#ff8fb3,#a98ee6)] p-6 text-white shadow-pink">
          <div className="flex items-center gap-3 text-lg font-black"><Heart fill="currentColor" /> Đếm ngày yêu</div>
          <div className="mt-6 text-6xl font-black">{days}</div>
          <p className="mt-2 font-bold opacity-90">ngày từ {shortDate(data.settings.anniversaryDate)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <MetricCard icon="🐷" label="Quỹ chung" value={formatVnd(balance)} />
          <MetricCard icon="🧾" label="Chi tháng này" value={formatVnd(monthlyExpense)} />
        </div>
      </div>
      <DebtLine debt={debt} />
      <Panel title="Sự kiện sắp tới" icon="🗓️">
        <div className="space-y-3">
          {upcoming.map((event: EventItem) => (
            <button key={event.id} onClick={() => onEditEvent(event)} className="flex w-full items-center gap-3 rounded-3xl bg-[#fff7fb] p-3 text-left">
              <span className="size-3 rounded-full" style={{ background: event.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{event.title}</p>
                <p className="text-sm font-semibold text-[#9a8b94]">{shortDate(event.startAt)} {event.location && `· ${event.location}`}</p>
              </div>
              <Pencil size={16} className="text-[#f25c8a]" />
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft">
      <div className="text-3xl">{icon}</div>
      <p className="mt-4 text-sm font-bold text-[#9a8b94]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#5b4a55]">{value}</p>
    </div>
  );
}

function DebtLine({ debt }: { debt: DebtSummary }) {
  if (!(debt.amount > 0 && debt.from && debt.to)) {
    return (
      <div className="rounded-[2rem] bg-white p-5 shadow-soft">
        <p className="text-sm font-bold text-[#9a8b94]">Ai nợ ai</p>
        <p className="mt-2 text-xl font-black">Đang huề nhau, dễ thương ghê.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-[#9a8b94]">Ai nợ ai</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xl font-black">
        <Avatar emoji={debt.from.emoji} color={debt.from.color} /> {debt.from.name} nợ <Avatar emoji={debt.to.emoji} color={debt.to.color} /> {debt.to.name} <span className="text-[#f25c8a]">{formatVnd(debt.amount)}</span>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-[2rem] bg-white p-4 shadow-soft sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-black">{icon} {title}</h3>
      {children}
    </section>
  );
}

function CalendarView({ data, onAdd, onEdit }: { data: CoupleData; onAdd: () => void; onEdit: (event: EventItem) => void }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState(startOfDay(new Date()));
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const events = data.events.filter((event: EventItem) => filter === "all" || event.calendarType === filter || event.ownerId === filter);
  const selectedEvents = events.filter((event: EventItem) => isSameDay(parseISO(event.startAt), selected));
  return (
    <section className="min-w-0 space-y-5">
      <Toolbar title="Lịch tháng" action={onAdd} />
      <Panel title={format(month, "MMMM yyyy", { locale: vi })} icon="🌙">
        <div className="mb-4 flex items-center justify-between gap-3">
          <IconButton onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={18} /></IconButton>
          <div className="flex flex-wrap gap-2">
            {["all", "shared", ...data.members.map((m) => m.id)].map((key) => (
              <button key={key} onClick={() => setFilter(key)} className={cn("rounded-full px-3 py-2 text-sm font-black", filter === key ? "bg-[#ffe1ed] text-[#f25c8a]" : "bg-[#fff7fb] text-[#9a8b94]")}>
                {key === "all" ? "Tất cả" : key === "shared" ? "Chung" : data.members.find((m) => m.id === key)?.emoji}
              </button>
            ))}
          </div>
          <IconButton onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></IconButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-[#9a8b94] sm:gap-2">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => <div key={d}>{d}</div>)}
          {days.map((day) => {
            const dayEvents = events.filter((event: EventItem) => isSameDay(parseISO(event.startAt), day));
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(day)}
                className={cn("aspect-square rounded-2xl bg-[#fff7fb] p-1 text-sm font-black transition", !isSameMonth(day, month) && "opacity-35", isSameDay(day, selected) && "bg-[#ffe1ed] text-[#f25c8a] ring-2 ring-[#ff8fb3]")}
              >
                <span>{format(day, "d")}</span>
                <span className="mt-1 flex justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((event: EventItem) => <span key={event.id} className="size-1.5 rounded-full" style={{ background: event.color }} />)}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel title={`Ngày ${format(selected, "dd/MM")}`} icon="✨">
        <EventList events={selectedEvents} data={data} onEdit={onEdit} />
      </Panel>
      <Fab onClick={onAdd} />
    </section>
  );
}

function EventList({ events, data, onEdit }: { events: EventItem[]; data: CoupleData; onEdit: (event: EventItem) => void }) {
  if (!events.length) return <p className="font-semibold text-[#9a8b94]">Ngày này đang trống, thêm một cái hẹn nhỏ nha.</p>;
  return (
    <div className="space-y-3">
      {events.map((event) => {
        const owner = data.members.find((m) => m.id === event.ownerId);
        return (
          <button key={event.id} onClick={() => onEdit(event)} className="flex w-full items-center gap-3 rounded-3xl bg-[#fff7fb] p-3 text-left">
            <span className="size-4 rounded-full" style={{ background: event.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black">{event.title}</p>
              <p className="text-sm font-semibold text-[#9a8b94]">{event.calendarType === "shared" ? "Lịch chung" : `Riêng ${owner?.name}`} {event.location && `· ${event.location}`}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ExpensesView({
  data,
  balance,
  monthlyExpense,
  debt,
  onAdd,
  onEdit,
}: {
  data: CoupleData;
  balance: number;
  monthlyExpense: number;
  debt: DebtSummary;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
}) {
  const sixMonths = getSixMonthStats(data.transactions);
  const donut = getCategoryExpenseStats(data.transactions, data.categories);
  const progress = Math.min(100, Math.max(0, (balance / data.settings.fundTarget) * 100));
  return (
    <section className="min-w-0 space-y-5">
      <Toolbar title="Chi tiêu" action={onAdd} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#4cc6a0,#5ba8f0)] p-6 text-white shadow-soft">
          <div className="flex items-center gap-2 text-lg font-black"><PiggyBank /> Quỹ chung</div>
          <p className="mt-5 text-4xl font-black">{formatVnd(balance)}</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/35"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2 text-sm font-bold opacity-90">Mục tiêu {formatVnd(data.settings.fundTarget)} · Chi tháng này {formatVnd(monthlyExpense)}</p>
        </div>
        <DebtLine debt={debt} />
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Panel title="Thu/chi 6 tháng" icon="📊">
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonths}>
                <YAxis hide domain={[0, "dataMax"]} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatVnd(Number(value))} />
                <Bar dataKey="thu" fill="#4cc6a0" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="chi" fill="#f25c8a" radius={[8, 8, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Chi theo danh mục" icon="🍩">
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value) => formatVnd(Number(value))} />
                <Pie data={donut} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3} isAnimationActive={false}>
                  {donut.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel title="Lịch sử giao dịch" icon="🧾">
        <div className="space-y-3">
          {data.transactions.map((tx: Transaction) => {
            const cat = data.categories.find((c: Category) => c.id === tx.categoryId);
            const payer = data.members.find((m) => m.id === tx.paidBy);
            return (
              <button key={tx.id} onClick={() => onEdit(tx)} className="flex w-full items-center gap-3 rounded-3xl bg-[#fff7fb] p-3 text-left">
                <span className="grid size-11 place-items-center rounded-full text-xl" style={{ background: `${cat?.color ?? payer?.color ?? "#ff8fb3"}22` }}>{tx.type === "deposit" ? "🐷" : cat?.emoji ?? "💌"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{tx.note || cat?.name || "Giao dịch"}</p>
                  <p className="text-sm font-semibold text-[#9a8b94]">{payer?.emoji} {payer?.name} · {shortDate(tx.occurredAt)}</p>
                </div>
                <p className={cn("font-black", tx.type === "expense" ? "text-[#f25c8a]" : "text-[#4cc6a0]")}>{tx.type === "expense" ? "-" : "+"}{formatVnd(tx.amount)}</p>
              </button>
            );
          })}
        </div>
      </Panel>
      <Fab onClick={onAdd} />
    </section>
  );
}

function SettingsView({ store }: { store: Store }) {
  const { data, setData } = store;
  const updateMember = (id: string, patch: Partial<Member>) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((member) => (member.id === id ? { ...member, ...patch } : member)) as CoupleData["members"],
    }));
  };
  const addCategory = () => setData((prev) => ({ ...prev, categories: [...prev.categories, { id: createId("cat"), name: "Mới", emoji: "💫", kind: "expense", color: "#ff8fb3" }] }));
  return (
    <section className="min-w-0 space-y-5">
      <div>
        <h2 className="text-3xl font-black">Cài đặt</h2>
        <p className="mt-1 font-semibold text-[#9a8b94]">Đồng bộ: {store.syncMode}</p>
      </div>
      <Panel title="Hai người" icon="🫶">
        <div className="grid gap-3 md:grid-cols-2">
          {data.members.map((member) => (
            <div key={member.id} className="rounded-3xl bg-[#fff7fb] p-4">
              <Input label="Tên" value={member.name} onChange={(value) => updateMember(member.id, { name: value })} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Input label="Emoji" value={member.emoji} onChange={(value) => updateMember(member.id, { emoji: value })} />
                <ColorInput label="Màu" value={member.color} onChange={(value) => updateMember(member.id, { color: value })} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Thông tin cặp đôi" icon="💗">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Tên cặp đôi" value={data.settings.coupleName} onChange={(value) => setData((prev) => ({ ...prev, settings: { ...prev.settings, coupleName: value } }))} />
          <Input label="Ngày kỷ niệm" type="date" value={data.settings.anniversaryDate.slice(0, 10)} onChange={(value) => setData((prev) => ({ ...prev, settings: { ...prev.settings, anniversaryDate: value } }))} />
          <Input label="PIN" value={data.settings.pin} onChange={(value) => { setData((prev) => ({ ...prev, settings: { ...prev.settings, pin: value.replace(/\D/g, "").slice(0, 4) } })); store.resetPinUnlock(); }} />
          <Input label="Mục tiêu quỹ" type="number" value={String(data.settings.fundTarget)} onChange={(value) => setData((prev) => ({ ...prev, settings: { ...prev.settings, fundTarget: Number(value) } }))} />
        </div>
      </Panel>
      <Panel title="Danh mục" icon="🏷️">
        <div className="space-y-3">
          {data.categories.map((cat) => (
            <div key={cat.id} className="grid gap-2 rounded-3xl bg-[#fff7fb] p-3 md:grid-cols-[0.8fr_1.2fr_1fr_1fr_auto]">
              <Input label="Emoji" value={cat.emoji} onChange={(value) => setData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? { ...c, emoji: value } : c) }))} />
              <Input label="Tên" value={cat.name} onChange={(value) => setData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? { ...c, name: value } : c) }))} />
              <Select label="Loại" value={cat.kind} onChange={(value) => setData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? { ...c, kind: value as Category["kind"] } : c) }))} options={[["expense", "Chi"], ["income", "Thu"]]} />
              <ColorInput label="Màu" value={cat.color} onChange={(value) => setData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? { ...c, color: value } : c) }))} />
              <button onClick={() => setData((prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== cat.id) }))} className="self-end rounded-2xl bg-white p-3 text-[#f25c8a]"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <button onClick={addCategory} className="mt-4 rounded-3xl bg-[#ffe1ed] px-4 py-3 font-black text-[#f25c8a]">+ Thêm danh mục</button>
      </Panel>
    </section>
  );
}

function Toolbar({ title, action }: { title: string; action: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-3xl font-black">{title}</h2>
      <button onClick={action} className="hidden items-center gap-2 rounded-3xl bg-[#f25c8a] px-4 py-3 font-black text-white shadow-pink sm:flex"><Plus size={18} /> Thêm</button>
    </div>
  );
}

function Fab({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="fixed bottom-24 right-5 z-20 grid size-14 place-items-center rounded-full bg-[#f25c8a] text-white shadow-pink lg:bottom-8"><Plus /></button>;
}

function IconButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff7fb] text-[#f25c8a]">{children}</button>;
}

function ModalFrame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#5b4a55]/30 p-3 backdrop-blur-sm sm:place-items-center">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_20px_70px_rgba(91,74,85,0.24)]">
        {children}
        <button onClick={onClose} className="mt-3 w-full rounded-3xl bg-[#fff7fb] px-4 py-3 font-black text-[#9a8b94]">Đóng</button>
      </motion.div>
    </div>
  );
}

function EventModal({ event, data, onClose, onSave, onDelete }: { event: EventItem; data: CoupleData; onClose: () => void; onSave: (event: EventItem) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<EventItem>(event);
  const set = (patch: Partial<EventItem>) => setDraft({ ...draft, ...patch });
  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-2xl font-black">{draft.id ? "Sửa sự kiện" : "Thêm sự kiện"}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input label="Tiêu đề" value={draft.title} onChange={(value) => set({ title: value })} />
        <Select label="Loại lịch" value={draft.calendarType} onChange={(value) => set({ calendarType: value as EventItem["calendarType"], ownerId: value === "shared" ? null : data.members[0].id })} options={[["shared", "Chung"], ["private", "Riêng"]]} />
        {draft.calendarType === "private" && <Select label="Chủ sở hữu" value={draft.ownerId ?? data.members[0].id} onChange={(value) => set({ ownerId: value })} options={data.members.map((m) => [m.id, `${m.emoji} ${m.name}`])} />}
        <Input label="Ngày" type="date" value={draft.startAt.slice(0, 10)} onChange={(value) => set({ startAt: formatISO(new Date(value)), endAt: formatISO(new Date(value)) })} />
        <label className="flex items-center gap-3 rounded-3xl bg-[#fff7fb] px-4 py-3 font-bold"><input type="checkbox" checked={draft.allDay} onChange={(e) => set({ allDay: e.target.checked })} /> Cả ngày</label>
        {!draft.allDay && <Input label="Giờ bắt đầu" type="time" value={format(parseISO(draft.startAt), "HH:mm")} onChange={(value) => set({ startAt: `${draft.startAt.slice(0, 10)}T${value}:00` })} />}
        {!draft.allDay && <Input label="Giờ kết thúc" type="time" value={format(parseISO(draft.endAt), "HH:mm")} onChange={(value) => set({ endAt: `${draft.endAt.slice(0, 10)}T${value}:00` })} />}
        <Input label="Địa điểm" value={draft.location} onChange={(value) => set({ location: value })} />
        <ColorInput label="Màu" value={draft.color} onChange={(value) => set({ color: value })} />
      </div>
      <TextArea label="Ghi chú" value={draft.note} onChange={(value) => set({ note: value })} />
      <ModalActions canDelete={!!draft.id} onDelete={() => onDelete(draft.id)} onSave={() => onSave(draft)} />
    </ModalFrame>
  );
}

function TransactionModal({ tx, data, onClose, onSave, onDelete }: { tx: Transaction; data: CoupleData; onClose: () => void; onSave: (tx: Transaction) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Transaction>(tx);
  const categories = data.categories.filter((cat: Category) => cat.kind === (draft.type === "expense" ? "expense" : "income"));
  const set = (patch: Partial<Transaction>) => setDraft({ ...draft, ...patch });
  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-2xl font-black">{draft.id ? "Sửa giao dịch" : "Thêm giao dịch"}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Select label="Loại" value={draft.type} onChange={(value) => set({ type: value as Transaction["type"], split: value === "expense" ? draft.split : "none" })} options={[["expense", "Chi"], ["income", "Thu"], ["deposit", "Nạp quỹ"]]} />
        <Input label="Số tiền VND" type="number" value={String(draft.amount || "")} onChange={(value) => set({ amount: Number(value) })} />
        {draft.type !== "deposit" && <Select label="Danh mục" value={draft.categoryId ?? categories[0]?.id ?? ""} onChange={(value) => set({ categoryId: value })} options={categories.map((c: Category) => [c.id, `${c.emoji} ${c.name}`])} />}
        <Select label="Người trả" value={draft.paidBy} onChange={(value) => set({ paidBy: value })} options={data.members.map((m) => [m.id, `${m.emoji} ${m.name}`])} />
        {draft.type === "expense" && <Select label="Kiểu chia" value={draft.split} onChange={(value) => set({ split: value as Transaction["split"], splitPayerShare: value === "5050" ? 0.5 : draft.splitPayerShare })} options={[["5050", "50-50"], ["custom", "Tuỳ chỉnh"], ["none", "Tự trả"]]} />}
        {draft.type === "expense" && draft.split === "custom" && (
          <label className="rounded-3xl bg-[#fff7fb] px-4 py-3 font-bold">
            Người trả gánh {Math.round(draft.splitPayerShare * 100)}%
            <input type="range" min="0" max="100" value={Math.round(draft.splitPayerShare * 100)} onChange={(e) => set({ splitPayerShare: Number(e.target.value) / 100 })} className="mt-2 w-full" />
          </label>
        )}
        <Input label="Ngày" type="date" value={draft.occurredAt.slice(0, 10)} onChange={(value) => set({ occurredAt: formatISO(new Date(value)) })} />
      </div>
      <TextArea label="Ghi chú" value={draft.note} onChange={(value) => set({ note: value })} />
      <ModalActions canDelete={!!draft.id} onDelete={() => onDelete(draft.id)} onSave={() => onSave(draft)} />
    </ModalFrame>
  );
}

function ModalActions({ canDelete, onDelete, onSave }: { canDelete: boolean; onDelete: () => void; onSave: () => void }) {
  return (
    <div className="mt-4 flex gap-3">
      {canDelete && <button onClick={onDelete} className="rounded-3xl bg-[#fff0f6] px-4 py-3 font-black text-[#f25c8a]"><Trash2 size={18} /></button>}
      <button onClick={onSave} className="flex-1 rounded-3xl bg-[#f25c8a] px-4 py-3 font-black text-white shadow-pink">Lưu</button>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-black text-[#9a8b94]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-3xl border border-[#ffe1ed] bg-white px-4 py-3 font-bold outline-none focus:border-[#ff8fb3]" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-sm font-black text-[#9a8b94]">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 w-full rounded-3xl border border-[#ffe1ed] bg-white px-4 py-3 font-bold outline-none focus:border-[#ff8fb3]" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-black text-[#9a8b94]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-3xl border border-[#ffe1ed] bg-white px-4 py-3 font-bold outline-none focus:border-[#ff8fb3]">
        {options.map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}
      </select>
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-black text-[#9a8b94]">{label}</span>
      <div className="flex items-center gap-2 rounded-3xl border border-[#ffe1ed] bg-white px-3 py-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-10 rounded-full" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-bold outline-none" />
      </div>
    </label>
  );
}
