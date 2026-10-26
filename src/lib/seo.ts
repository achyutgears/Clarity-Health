export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} · Clarity Health` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Clarity Health` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
