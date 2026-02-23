import { NavLink, Outlet, useLoaderData, useSearchParams } from "react-router";
import type { Route } from "./+types/app-layout";
import { requireUser } from "~/auth/require-user";
import { getAppContext } from "~/server/context";
import { findFollowsWithArtists } from "~/db/repositories/follows.repository";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ArtistFilter } from "~/components/artist-filter";
import { cn } from "~/lib/utils";
import { LogOut, Settings } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = getAppContext();
  const user = await requireUser(request, ctx.db, ctx.sessions);
  const follows = findFollowsWithArtists(ctx.db, user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    follows,
  };
}

const tabLinkClass = ({
  isActive,
}: {
  isActive: boolean;
  isPending: boolean;
}) =>
  cn(
    "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:text-foreground hover:bg-accent",
  );

function TabLink({ to, children }: { to: string; children: React.ReactNode }) {
  const href = useFilteredTo(to);
  return (
    <NavLink to={href} className={tabLinkClass}>
      {children}
    </NavLink>
  );
}

function useFilteredTo(path: string): string {
  const [searchParams] = useSearchParams();
  const parts: string[] = [];
  for (const key of ["artists", "distance", "types"] as const) {
    const val = searchParams.get(key);
    if (val) parts.push(`${key}=${val}`);
  }
  return parts.length ? `${path}?${parts.join("&")}` : path;
}

export default function AppLayout() {
  const { user, follows } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <span className="mr-8 text-lg font-semibold tracking-tight">
            Music App
          </span>

          <nav className="flex gap-1">
            <TabLink to="/releases">Releases</TabLink>
            <TabLink to="/events">Events</TabLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/artists"
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )
              }
            >
              Artists
            </NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form method="post" action="/auth/logout" className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center text-left"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        {follows.length > 0 && (
          <div className="mb-4">
            <ArtistFilter follows={follows} />
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
