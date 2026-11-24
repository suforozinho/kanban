import "server-only";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./errors";
import { getCurrentUserId } from "./session";

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  return schema.parse(body);
}

type Handler<P> = (args: {
  req: Request;
  userId: string;
  params: P;
}) => Promise<Response | object | null>;

/**
 * Wraps a route handler: requires a signed-in user, then turns thrown errors
 * into JSON responses. Every API route goes through this.
 */
export function withUser<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

      const result = await handler({ req, userId, params: await ctx.params });
      if (result instanceof Response) return result;
      if (result === null) return new Response(null, { status: 204 });
      return Response.json(result);
    } catch (error) {
      if (error instanceof HttpError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return Response.json(
          { error: error.issues[0]?.message ?? "Invalid input", issues: error.issues },
          { status: 400 },
        );
      }
      console.error(error);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
