import { handleLogout } from "~/auth/auth-handlers";
import { getAppContext } from "~/server/context";
import type { Route } from "./+types/auth.logout";

export async function action({ request }: Route.ActionArgs) {
  return handleLogout(request, getAppContext());
}
