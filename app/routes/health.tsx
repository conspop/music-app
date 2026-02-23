import type { LoaderFunctionArgs } from "react-router";
import { getAppContext } from "~/server/context";

export async function loader(_args: LoaderFunctionArgs) {
  try {
    const ctx = getAppContext();
    ctx.db.$client.prepare("SELECT 1").run();
    return Response.json({ status: "ok", db: "connected" });
  } catch {
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
