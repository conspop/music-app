import { handleGoogleRedirect } from "~/auth/auth-handlers";
import { getAppContext } from "~/server/context";
import type { Route } from "./+types/auth.google";

export async function loader({ request }: Route.LoaderArgs) {
  return handleGoogleRedirect(request, getAppContext());
}
