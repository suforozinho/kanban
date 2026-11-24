import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Session for Server Components. `connection()` keeps the read out of any
 * prerender: Auth.js may re-encrypt the session token, which needs randomness
 * that Next.js does not allow while prerendering.
 */
export async function getRenderSession() {
  await connection();
  return auth();
}

/** For pages: send signed-out visitors to the landing page. */
export async function requireUserId(): Promise<string> {
  const session = await getRenderSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  return userId;
}
