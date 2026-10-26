import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Home", "Clarity Health — healthcare instructions, made clearer."),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
