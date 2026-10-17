import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

// Minimal file-based accounts for local/demo use (data/ is git-ignored).
// For production swap readUsers/writeUsers for a real database.
const scrypt = promisify(crypto.scrypt);
const DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DIR, "users.json");
const SECRET_FILE = path.join(DIR, ".secret");

export const COOKIE = "genz_session";
const SESSION_DAYS = 14;

async function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    return (await fs.readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    const s = crypto.randomBytes(32).toString("hex");
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(SECRET_FILE, s, { mode: 0o600 });
    return s;
  }
}

async function readUsers() {
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}
async function writeUsers(users) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}
async function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

export async function createUser({ name, email, password }) {
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  if (name.length < 2) throw new AuthError("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError("Please enter a valid email.");
  if (password.length < 8) throw new AuthError("Password must be at least 8 characters.");

  const users = await readUsers();
  if (users.some((u) => u.email === email)) throw new AuthError("An account with this email already exists.", 409);

  const user = { id: crypto.randomUUID(), name, email, password: await hashPassword(password), createdAt: Date.now() };
  await writeUsers([...users, user]);
  return publicUser(user);
}

// naive in-memory throttle: 8 failed attempts per 10 minutes per email
const failures = new Map();
export async function verifyUser(email, password) {
  email = String(email || "").trim().toLowerCase();
  const now = Date.now();
  const recent = (failures.get(email) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 8) throw new AuthError("Too many attempts. Try again in a few minutes.", 429);

  const user = (await readUsers()).find((u) => u.email === email);
  if (!user || !(await checkPassword(String(password || ""), user.password))) {
    failures.set(email, [...recent, now]);
    throw new AuthError("Incorrect email or password.", 401);
  }
  failures.delete(email);
  return publicUser(user);
}

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---- signed session cookie: base64url(payload).hmac ----
async function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", await secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export async function sessionCookie(userId) {
  const token = await sign({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;

export async function getUser(req) {
  const raw = req.headers.get("cookie") || "";
  const token = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return null;

  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", await secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!uid || exp < Date.now()) return null;
    const user = (await readUsers()).find((u) => u.id === uid);
    return user ? publicUser(user) : null;
  } catch {
    return null;
  }
}

// Login is optional unless REQUIRE_LOGIN=true is set in .env.local.
export const AUTH_REQUIRED = process.env.REQUIRE_LOGIN === "true";
export async function isAllowed(req) {
  return !AUTH_REQUIRED || !!(await getUser(req));
}

export const unauthorized = () =>
  Response.json({ error: "Please log in to use this feature.", code: "auth_required" }, { status: 401 });

export function authErrorResponse(error) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Auth error:", error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
