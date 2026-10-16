// Comparing technology names, so "React.js", "ReactJS" and "react" all find the
// React pack. No imports: the UI uses it too.

/** Common short names, by their normalized form. */
const aliases: Record<string, string> = {
  js: "javascript",
  ecmascript: "javascript",
  ts: "typescript",
  golang: "go",
  csharp: "c#",
  postgres: "postgresql",
  k8s: "kubernetes",
  node: "nodejs",
  vue: "vuejs",
};

/**
 * A technology name reduced to what identifies it: lowercase, without accents,
 * spaces, dots, dashes or a "js" suffix. "#" and "+" are kept, so C# and C++ stay apart.
 */
export function technologyKey(name: string): string {
  let key = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/]+/g, "");
  key = aliases[key] ?? key;
  // "reactjs" → "react", but keep "nodejs" and "vuejs" whole (their aliases point there).
  if (key.endsWith("js") && key.length > 4 && !["nodejs", "vuejs", "nextjs", "nuxtjs"].includes(key)) {
    key = key.slice(0, -2);
  }
  if (key === "next") key = "nextjs";
  if (key === "nuxt") key = "nuxtjs";
  return key;
}

/** True when two names mean the same technology. */
export function sameTechnology(a: string, b: string): boolean {
  return technologyKey(a) === technologyKey(b);
}
