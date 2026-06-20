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
  // Use esbuild stdin so we never need api/index.ts in the repo.
  // The handler is emitted as a plain CJS function via module.exports — no ESM export dance.
  const apiExternals = externals.filter(
    (e) => e !== "@anthropic-ai/sdk" && e !== "@supabase/supabase-js"
  );

  await esbuild({
    stdin: {
      // Use require() interop pattern — this file is treated as CJS entry.
      // module.exports is directly set to the handler function so Vercel's
      // @vercel/node runtime receives a plain CJS function with no ESM dance.
      contents: `
const express = require("express");
const { createServer } = require("node:http");
const { registerRoutes } = require("./server/routes");

const app = express();
const httpServer = createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;
let initError = null;
const initPromise = registerRoutes(httpServer, app)
  .then(() => { initialized = true; })
  .catch((e) => { initError = e; });

module.exports = async function handler(req, res) {
  if (!initialized && !initError) await initPromise;
  if (initError) {
    res.status(500).json({ error: initError.message || "Init failed" });
    return;
  }
  app(req, res);
};
`,
      resolveDir: ".",
      loader: "js",
    },
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: apiExternals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
