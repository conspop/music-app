import { handleGoogleCallback } from "~/auth/auth-handlers";
import { getAppContext } from "~/server/context";
import type { Route } from "./+types/auth.google.callback";

export async function loader({ request }: Route.LoaderArgs) {
  return handleGoogleCallback(request, getAppContext());
}
