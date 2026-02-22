import { useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { requireUser } from "~/auth/require-user";
import { getAppContext } from "~/server/context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Music App" },
    { name: "description", content: "Stay on top of your favorite artists." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  return { user: { id: user.id, name: user.name, email: user.email } };
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as {user.email}.
        </p>
        <form method="post" action="/auth/logout">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
