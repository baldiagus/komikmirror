import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  let project = process.env.COMPOSE_PROJECT_NAME || "komik_mirror_dev";
  let composeFile = "docker-compose.yml";
  let envFile = ".env";
  let outDir = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" && args[i + 1]) project = args[++i];
    else if (args[i] === "--file" && args[i + 1]) composeFile = args[++i];
    else if (args[i] === "--env-file" && args[i + 1]) envFile = args[++i];
    else if (args[i] === "--out" && args[i + 1]) outDir = args[++i];
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (!outDir) outDir = path.resolve("backups", `${project}-${stamp}`);
  else outDir = path.resolve(outDir);

  return { project, composeFile, envFile, outDir };
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function main() {
  const { project, composeFile, envFile, outDir } = parseArgs();
  mkdirSync(outDir, { recursive: true });

  const dbDumpPath = path.join(outDir, "db.sql");
  const mediaArchivePath = path.join(outDir, "media.tar.gz");

  console.log(`[backup] Dumping MySQL database from compose project "${project}"...`);
  const dumpStdout = execFileSync(
    "docker",
    [
      "compose",
      "-p",
      project,
      "--env-file",
      envFile,
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "sh",
      "-c",
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --no-tablespaces -uroot "$MYSQL_DATABASE"',
    ],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  writeFileSync(dbDumpPath, dumpStdout);

  const mediaVolume = `${project}_media_data`;
  console.log(`[backup] Archiving media volume "${mediaVolume}"...`);
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${mediaVolume}:/media:ro`,
      "-v",
      `${outDir}:/backup`,
      "alpine:3.21",
      "tar",
      "czf",
      "/backup/media.tar.gz",
      "-C",
      "/media",
      ".",
    ],
    { stdio: "inherit" },
  );

  const manifest = {
    createdAt: new Date().toISOString(),
    project,
    files: {
      "db.sql": {
        bytes: readFileSync(dbDumpPath).length,
        sha256: sha256File(dbDumpPath),
      },
      "media.tar.gz": {
        bytes: readFileSync(mediaArchivePath).length,
        sha256: sha256File(mediaArchivePath),
      },
    },
  };
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`[backup] Completed backup set at ${outDir}`);
  console.log(JSON.stringify(manifest, null, 2));
}

main();
