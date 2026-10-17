"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ClipboardCopy, ExternalLink, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import Markdown from "./Markdown";

const KEY = "genz-train-plan-v1";
const IRCTC_URL = "https://www.irctc.co.in/nget/train-search";
const CLASSES = ["SL", "3A", "3E", "2A", "1A", "CC", "EC", "2S"];
const AC_CLASSES = ["3A", "3E", "2A", "1A", "CC", "EC"];
const QUOTAS = ["Tatkal", "Premium Tatkal", "General"];
const BERTHS = ["No preference", "Lower", "Middle", "Upper", "Side Lower", "Side Upper", "Window"];
const CHECKLIST = [
  "IRCTC account is active and I remember the password",
  "Aadhaar / mobile verification on my IRCTC account is done",
  "IRCTC eWallet (or UPI/bank) has enough balance for the fare",
  "Passengers are saved in IRCTC's Master List",
  "Mobile for OTP is with me and the email on my account is correct",
  "Internet is stable; I will log in 10 minutes before opening time",
];

const blankPassenger = () => ({ name: "", age: "", gender: "M", berth: "No preference" });
const DEFAULT = {
  from: "",
  to: "",
  date: "",
  cls: "3A",
  quota: "Tatkal",
  passengers: [blankPassenger()],
  mobile: "",
  checks: [],
};

// Tatkal opens one day before the journey: 10:00 IST for AC classes, 11:00 IST for sleeper/2S.
function openingTime(date, cls, quota) {
  if (!date || quota === "General") return null;
  const d = new Date(`${date}T00:00:00+05:30`);
  d.setDate(d.getDate() - 1);
  const day = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const hour = AC_CLASSES.includes(cls) ? "10" : "11";
  return new Date(`${day}T${hour}:00:00+05:30`);
}

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const ms = target.getTime() - now;
  if (ms <= 0) return { open: true };
  const s = Math.floor(ms / 1000);
  return { open: false, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export default function TrainAssistant({ open, onClose, onOpenLink }) {
  const [plan, setPlan] = useState(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [ai, setAi] = useState(null); // { message, sources } | { error }
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved) setPlan({ ...DEFAULT, ...saved });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(plan));
    } catch {}
  }, [plan, loaded]);

  const opensAt = useMemo(() => openingTime(plan.date, plan.cls, plan.quota), [plan.date, plan.cls, plan.quota]);
  const countdown = useCountdown(opensAt);

  if (!open) return null;

  const set = (k) => (e) => setPlan((p) => ({ ...p, [k]: e.target.value }));
  const setPax = (i, k, v) =>
    setPlan((p) => ({ ...p, passengers: p.passengers.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const toggleCheck = (i) =>
    setPlan((p) => ({ ...p, checks: p.checks.includes(i) ? p.checks.filter((x) => x !== i) : [...p.checks, i] }));

  const findTrains = async () => {
    setBusy(true);
    setAi(null);
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setAi(data);
    } catch (err) {
      setAi({ error: err.message });
    } finally {
      setBusy(false);
    }
  };

  const copyDetails = async () => {
    const lines = [
      `${plan.from} -> ${plan.to} | ${plan.date} | ${plan.cls} | ${plan.quota}`,
      ...plan.passengers.map((p, i) => `${i + 1}. ${p.name}, ${p.age}, ${p.gender}, ${p.berth}`),
      plan.mobile && `Mobile: ${plan.mobile}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const input = "w-full px-3 py-2 rounded-lg bg-ink/5 border border-ink/10 outline-none focus:border-sky-500 text-sm placeholder:text-muted";
  const label = "block text-xs text-muted mb-1";
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-popup text-fg border border-ink/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-popup border-b border-ink/10">
          <div>
            <h2 className="text-lg font-semibold">Train ticket assistant</h2>
            <p className="text-xs text-muted">Plan your Tatkal booking, then book on IRCTC.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink/10 cursor-pointer" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex gap-3 p-3 rounded-xl bg-sky-500/10 text-sm">
            <ShieldCheck size={18} className="shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
            <p>
              Gen-Z AI does <b>not</b> log in to IRCTC or book for you: IRCTC forbids automated booking and needs your own
              CAPTCHA/OTP. Your IRCTC ID and password are never asked for or stored here. Fill your details once, get the
              countdown and checklist, and book yourself on the official site. IRCTC emails the e-ticket to your registered email.
            </p>
          </div>

          {/* journey */}
          <section>
            <h3 className="font-medium mb-3">1. Journey</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={label}>From</label>
                <input className={input} placeholder="e.g. New Delhi" value={plan.from} onChange={set("from")} />
              </div>
              <div>
                <label className={label}>To</label>
                <input className={input} placeholder="e.g. Patna" value={plan.to} onChange={set("to")} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={label}>Journey date</label>
                <input type="date" className={input} value={plan.date} onChange={set("date")} />
              </div>
              <div>
                <label className={label}>Class</label>
                <select className={input} value={plan.cls} onChange={set("cls")}>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Quota</label>
                <select className={input} value={plan.quota} onChange={set("quota")}>
                  {QUOTAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Mobile (for your reference)</label>
                <input className={input} inputMode="tel" placeholder="10-digit number" value={plan.mobile} onChange={set("mobile")} />
              </div>
            </div>
          </section>

          {/* countdown */}
          <section className="rounded-2xl border border-ink/10 p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CalendarClock size={18} /> Booking window
            </div>
            {!opensAt ? (
              <p className="text-sm text-muted">
                {plan.quota === "General"
                  ? "General quota opens up to 60 days in advance (check IRCTC for the current limit)."
                  : "Pick a journey date to see when Tatkal opens."}
              </p>
            ) : countdown?.open ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                The window has opened (or passed) for this date. Open IRCTC now.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted mb-3">
                  {plan.quota} for {plan.cls} opens{" "}
                  <b className="text-fg">
                    {opensAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST
                  </b>{" "}
                  (one day before the journey; AC classes 10:00, others 11:00).
                </p>
                <div className="flex gap-2 text-center">
                  {[
                    ["Days", countdown.d],
                    ["Hours", countdown.h],
                    ["Min", countdown.m],
                    ["Sec", countdown.s],
                  ].map(([name, v]) => (
                    <div key={name} className="flex-1 rounded-xl bg-ink/5 py-2">
                      <div className="text-2xl font-semibold tabular-nums">{pad(v)}</div>
                      <div className="text-[11px] text-muted">{name}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="text-[11px] text-muted mt-3">Timings and rules can change; confirm on IRCTC.</p>
          </section>

          {/* passengers */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">2. Passengers</h3>
              {plan.passengers.length < 6 && (
                <button
                  onClick={() => setPlan((p) => ({ ...p, passengers: [...p.passengers, blankPassenger()] }))}
                  className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 cursor-pointer"
                >
                  <Plus size={16} /> Add passenger
                </button>
              )}
            </div>
            <div className="space-y-3">
              {plan.passengers.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-4">
                    {i === 0 && <label className={label}>Name (as on ID)</label>}
                    <input className={input} placeholder={`Passenger ${i + 1}`} value={p.name} onChange={(e) => setPax(i, "name", e.target.value)} />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    {i === 0 && <label className={label}>Age</label>}
                    <input className={input} inputMode="numeric" placeholder="Age" value={p.age} onChange={(e) => setPax(i, "age", e.target.value.replace(/\D/g, "").slice(0, 3))} />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    {i === 0 && <label className={label}>Gender</label>}
                    <select className={input} value={p.gender} onChange={(e) => setPax(i, "gender", e.target.value)}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="T">Other</option>
                    </select>
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    {i === 0 && <label className={label}>Berth</label>}
                    <select className={input} value={p.berth} onChange={(e) => setPax(i, "berth", e.target.value)}>
                      {BERTHS.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {plan.passengers.length > 1 && (
                      <button
                        onClick={() => setPlan((pl) => ({ ...pl, passengers: pl.passengers.filter((_, j) => j !== i) }))}
                        className="p-2 text-muted hover:text-red-500 cursor-pointer"
                        aria-label="Remove passenger"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2">Saved only in this browser. Berth preference is a request, not a guarantee.</p>
          </section>

          {/* checklist */}
          <section>
            <h3 className="font-medium mb-3">3. Before it opens</h3>
            <ul className="space-y-2">
              {CHECKLIST.map((t, i) => {
                const on = plan.checks.includes(i);
                return (
                  <li key={t}>
                    <button onClick={() => toggleCheck(i)} className="flex items-start gap-3 text-left text-sm cursor-pointer">
                      <span
                        className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${
                          on ? "bg-emerald-500 border-emerald-500 text-white" : "border-ink/30"
                        }`}
                      >
                        {on && <Check size={14} />}
                      </span>
                      <span className={on ? "text-muted line-through" : ""}>{t}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* AI suggestions */}
          <section>
            <h3 className="font-medium mb-3">4. Find trains</h3>
            <button
              onClick={findTrains}
              disabled={busy || !plan.from.trim() || !plan.to.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ink/15 text-sm hover:bg-ink/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Search size={16} /> {busy ? "Searching..." : "Suggest trains for this route"}
            </button>
            {busy && (
              <div className="mt-3 space-y-2" aria-hidden>
                <div className="skeleton h-3 rounded-full w-[90%]" />
                <div className="skeleton h-3 rounded-full w-[70%]" />
              </div>
            )}
            {ai?.error && <p className="mt-3 text-sm text-red-500">{ai.error}</p>}
            {ai?.message && (
              <div className="mt-3">
                <Markdown text={ai.message} onRun={() => {}} onOpenLink={onOpenLink} />
                {ai.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ai.sources.map((s, k) => (
                      <a key={k} href={s.url} target="_blank" rel="noopener noreferrer" className="max-w-[14rem] truncate px-3 py-1 rounded-full border border-ink/10 text-xs text-soft hover:bg-ink/5">
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-ink/10">
            <a
              href={IRCTC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-app font-medium text-sm"
            >
              Open IRCTC <ExternalLink size={16} />
            </a>
            <button onClick={copyDetails} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink/15 text-sm hover:bg-ink/5 cursor-pointer">
              {copied ? <Check size={16} className="text-emerald-500" /> : <ClipboardCopy size={16} />}
              {copied ? "Copied" : "Copy details"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
