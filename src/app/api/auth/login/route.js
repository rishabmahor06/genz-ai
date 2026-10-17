import { verifyUser, sessionCookie, authErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const user = await verifyUser(email, password);
    return Response.json({ user }, { headers: { "Set-Cookie": await sessionCookie(user.id) } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
