import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "node:fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@anthropic-ai/sdk",
  "@supabase/supabase-js",
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("building vercel api handler...");
  // Write a temporary entry point if it doesn't exist (api/index.ts is gitignored).
  // This makes the build reproducible in any environment including Vercel CI.
  const { writeFile, access } = await import("node:fs/promises");
  const apiEntry = "api/index.ts";
  let createdEntry = false;
  try {
    await access(apiEntry);
  } catch {
    // File doesn't exist — create it temporarily for this build
    await writeFile(apiEntry, [
      'import "dotenv/config";',
      'import express from "express";',
      'import { createServer } from "node:http";',
      'import { registerRoutes } from "../server/routes";',
      'const app = express();',
      'const httpServer = createServer(app);',
      'app.use(express.json());',
      'app.use(express.urlencoded({ extended: false }));',
      'let initialized = false;',
      'const initPromise = registerRoutes(httpServer, app).then(() => { initialized = true; });',
      'export default async function handler(req: any, res: any) {',
      '  if (!initialized) await initPromise;',
      '  app(req, res);',
      '}',
    ].join("\n"));
    createdEntry = true;
  }

  await esbuild({
    entryPoints: [apiEntry],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    // Bundle @anthropic-ai/sdk and @supabase/supabase-js — pure JS, no native binaries
    external: externals.filter(e => e !== '@anthropic-ai/sdk' && e !== '@supabase/supabase-js'),
    logLevel: "info",
  });

  // Clean up the temp entry if we created it
  if (createdEntry) {
    const { unlink } = await import("node:fs/promises");
    await unlink(apiEntry).catch(() => {});
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
