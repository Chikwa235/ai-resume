import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/auth", "routes/auth.tsx"),
  route("/upload", "routes/upload.tsx"),
  route("/resume/:id", "routes/resume.tsx"),
  route("/wipe", "routes/wipe.tsx"),

  // Resource route for your POST endpoint
  route("/api/feedback", "routes/api.feedback.ts"),
] satisfies RouteConfig;