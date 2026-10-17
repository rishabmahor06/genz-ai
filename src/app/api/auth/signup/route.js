import { createUser, sessionCookie, authErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const user = await createUser(await req.json());
    return Response.json({ user }, { headers: { "Set-Cookie": await sessionCookie(user.id) } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
