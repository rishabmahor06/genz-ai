"use client";
import { useState } from "react";
import { Eye, EyeOff, Lock, X } from "lucide-react";

// Login / sign-up dialog. `reason` explains which feature needs an account.
export default function AuthModal({ open, reason, onClose, onSuccess }) {
  const [tab, setTab] = useState("login"); // login | signup
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setForm({ name: "", email: "", password: "" });
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full px-4 py-2.5 rounded-xl bg-ink/5 border border-ink/10 outline-none focus:border-sky-500 text-[15px] placeholder:text-muted";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-3xl bg-popup text-fg border border-ink/10 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-ink/10 cursor-pointer" aria-label="Close">
          <X size={18} />
        </button>

        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 flex items-center justify-center mb-3">
          <Lock size={20} className="text-black" />
        </div>
        <h2 className="text-xl font-semibold">{tab === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="text-sm text-muted mt-1 mb-4">{reason || "Log in to unlock image, video and the train assistant."}</p>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-ink/5 mb-4 text-sm">
          {[
            ["login", "Log in"],
            ["signup", "Sign up"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setError("");
              }}
              className={`py-1.5 rounded-lg cursor-pointer ${tab === key ? "bg-app shadow font-medium" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" && (
            <input className={field} placeholder="Full name" autoComplete="name" value={form.name} onChange={set("name")} required />
          )}
          <input
            className={field}
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            required
          />
          <div className="relative">
            <input
              className={`${field} pr-11`}
              type={show ? "text" : "password"}
              placeholder={tab === "signup" ? "Password (min 8 characters)" : "Password"}
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              value={form.password}
              onChange={set("password")}
              required
              minLength={tab === "signup" ? 8 : undefined}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted cursor-pointer"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-ink text-app font-medium disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Please wait..." : tab === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
