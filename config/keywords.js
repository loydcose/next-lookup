// Relevance scoring. Each skill counts once per job:
//   found in the title       -> weight × 2
//   found in the description -> weight × 1
// Negative weights push a job down. Jobs scoring RELEVANCE_THRESHOLD or more are
// marked relevant (blue bar, sorted higher, sent as Telegram alerts).
export const SKILLS = [
  // Core stack
  { name: "Next.js", weight: 5, patterns: ["next.js", "nextjs", "next js", "app router"] },
  { name: "React", weight: 4, patterns: ["react", "reactjs", "react.js", "react js"] },
  { name: "Supabase", weight: 3, patterns: ["supabase"] },
  { name: "TypeScript", weight: 3, patterns: ["typescript"] },

  // Frontend
  { name: "Tailwind", weight: 2, patterns: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "shadcn/ui", weight: 3, patterns: ["shadcn", "shadcn/ui", "shadcn ui"] },
  { name: "Zustand", weight: 2, patterns: ["zustand"] },
  { name: "Redux", weight: 1, patterns: ["redux"] },

  // Backend & data
  { name: "Node.js", weight: 2, patterns: ["node.js", "nodejs", "node js"] },
  { name: "PostgreSQL", weight: 2, patterns: ["postgresql", "postgres"] },
  { name: "MongoDB", weight: 3, patterns: ["mongodb", "mongo db", "mongoose"] },
  { name: "Prisma", weight: 3, patterns: ["prisma"] },
  { name: "Neon", weight: 1, patterns: ["neon db", "neon database", "neon.tech", "neon postgres"] },
  { name: "Stripe", weight: 2, patterns: ["stripe"] },
  { name: "Headless CMS", weight: 3, patterns: ["headless cms", "strapi", "storyblok", "sanity.io", "sanity cms"] },

  // AI
  {
    name: "AI / LLM",
    weight: 3,
    patterns: [
      "llm", "llms", "openai", "anthropic", "claude api", "ai sdk", "langchain",
      "ai agent", "ai agents", "ai integration", "ai-powered", "ai powered",
      "ai engineer", "ai developer",
    ],
  },
  { name: "Vibe-coded apps", weight: 3, patterns: ["lovable", "bolt.new", "v0", "vibe coded", "vibe-coded", "vibe coding"] },
  { name: "n8n", weight: 3, patterns: ["n8n"] },

  // Infrastructure
  { name: "Vercel", weight: 4, patterns: ["vercel"] },
  { name: "Cloudflare", weight: 1, patterns: ["cloudflare"] },
  { name: "Google Cloud", weight: 2, patterns: ["google cloud", "gcp"] },
  { name: "Sentry / PostHog", weight: 2, patterns: ["sentry", "posthog"] },

  // Role words (weak on their own)
  { name: "Full stack", weight: 3, patterns: ["full stack", "full-stack", "fullstack"] },
  { name: "Frontend", weight: 2, patterns: ["frontend", "front-end", "front end"] },
  { name: "Software developer", weight: 1, patterns: ["software developer"] },
  { name: "Web developer", weight: 2, patterns: ["web developer", "website developer"] },
  { name: "SaaS / MVP", weight: 3, patterns: ["saas", "mvp"] },

  // Things you don't want
  { name: "PHP", weight: -3, patterns: ["php"] },
  { name: "Laravel", weight: -3, patterns: ["laravel"] },
  { name: "Java", weight: -3, patterns: ["java"] },
  { name: ".NET / C#", weight: -4, patterns: [".net", "c#"] },
  { name: "Shopify", weight: -4, patterns: ["shopify"] },
  { name: "WordPress", weight: -4, patterns: ["wordpress"] },
];

export const RELEVANCE_THRESHOLD = 6;

// Jobs with any of these in the TITLE are dropped before their description is fetched.
export const TITLE_EXCLUDE_KEYWORDS = [
  "wordpress",
  "shopify",
  "va",
  "virtual assistant",
  "game dev",
  "game developer",
  "automation",
];
