/* eslint-disable @typescript-eslint/no-require-imports */

const { existsSync, readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = resolve(__dirname, "..");
const schemaPath = process.env.PRISMA_SCHEMA_PATH
  ? resolve(root, process.env.PRISMA_SCHEMA_PATH)
  : resolve(root, "prisma", "schema.prisma");

function resolvePackage(packageName) {
  try {
    return require.resolve(`${packageName}/package.json`, {
      paths: [root],
    });
  } catch {
    return null;
  }
}

function resolveModule(moduleName) {
  try {
    return require.resolve(moduleName, {
      paths: [root],
    });
  } catch {
    return null;
  }
}

const hasSchema = existsSync(schemaPath);
const prismaCliPackage = resolvePackage("prisma");
const prismaClientPackage = resolvePackage("@prisma/client");
const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

if (!hasSchema && !prismaCliPackage && !prismaClientPackage) {
  console.log("[prisma] Prisma is not used in this project. Skipping generate.");
  process.exit(0);
}

if (!hasSchema) {
  console.log(
    `[prisma] Prisma package detected, but schema was not found at ${schemaPath}. Skipping generate.`,
  );
  process.exit(0);
}

const prismaCliEntry = resolveModule("prisma/build/index.js");

if (!prismaCliEntry) {
  console.error(
    "[prisma] schema.prisma was found, but the Prisma CLI is not installed. Add `prisma` to devDependencies.",
  );
  process.exit(1);
}

const env = {
  ...process.env,
};

if (!env.PRISMA_HIDE_UPDATE_MESSAGE) {
  env.PRISMA_HIDE_UPDATE_MESSAGE = "true";
}

const schema = readFileSync(schemaPath, "utf8");
const requiredEnvNames = Array.from(
  new Set(
    Array.from(schema.matchAll(/env\(["']([^"']+)["']\)/g)).map((match) => match[1]),
  ),
);
const missingEnvNames = requiredEnvNames.filter((name) => !env[name]);

if (missingEnvNames.length > 0 && isProduction) {
  console.error(
    `[prisma] Missing required production env var(s): ${missingEnvNames.join(
      ", ",
    )}. Add them in Vercel Project Settings > Environment Variables.`,
  );
  process.exit(1);
}

for (const name of missingEnvNames) {
  if (name === "DATABASE_URL" || name === "DIRECT_URL") {
    env[name] =
      "postgresql://postgres:postgres@localhost:5432/meongnyang_saju?schema=public";
    console.warn(
      `[prisma] ${name} is not set. Using a local placeholder for Prisma Client generation.`,
    );
  }
}

const result = spawnSync(
  process.execPath,
  [prismaCliEntry, "generate", "--schema", schemaPath],
  {
    cwd: root,
    env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("[prisma] Failed to run prisma generate.", result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (prismaClientPackage) {
  console.log(
    `[prisma] Prisma Client generated from ${schemaPath} into ${dirname(
      prismaClientPackage,
    )}.`,
  );
} else {
  console.log(`[prisma] Prisma generate completed from ${schemaPath}.`);
}
