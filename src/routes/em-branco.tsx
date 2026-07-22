import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/em-branco")({
  head: () => ({
    meta: [
      { title: "Página em branco — PAGOU" },
      { name: "description", content: "Página em branco para uso interno." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <div />,
});