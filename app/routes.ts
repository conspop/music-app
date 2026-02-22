import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/app-layout.tsx", [
    index("routes/index-redirect.tsx"),
    route("news", "routes/news.tsx"),
    route("releases", "routes/releases.tsx"),
    route("events", "routes/events.tsx"),
    route("artists", "routes/artists.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
  route("login", "routes/login.tsx"),
  route("auth/google", "routes/auth.google.tsx"),
  route("auth/google/callback", "routes/auth.google.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("api/follows", "routes/api.follows.tsx"),
  route("api/feed", "routes/api.feed.tsx"),
  route("api/upcoming", "routes/api.upcoming.tsx"),
  route("api/ingest", "routes/api.ingest.tsx"),
] satisfies RouteConfig;
