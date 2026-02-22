import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/google", "routes/auth.google.tsx"),
  route("auth/google/callback", "routes/auth.google.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("api/follows", "routes/api.follows.tsx"),
  route("api/feed", "routes/api.feed.tsx"),
  route("api/upcoming", "routes/api.upcoming.tsx"),
] satisfies RouteConfig;
