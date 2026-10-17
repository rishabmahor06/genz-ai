import { AUTH_REQUIRED, getUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  return Response.json({ user: await getUser(req), authRequired: AUTH_REQUIRED });
}
