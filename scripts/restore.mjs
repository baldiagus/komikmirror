import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  let project = process.env.COMPOSE_PROJECT_NAME || "komik_mirror_restore";
  let composeFile = "docker-compose.yml";
  let envFile = ".env";
  let fromDir = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" && args[i + 1]) project = args[++i];
    else if (args[i] === "--file" && args[i + 1]) composeFile = args[++i];
    else if (args[i] === "--env-file" && args[i + 1]) envFile = args[++i];
    else if (args[i] === "--from" && args[i + 1]) fromDir = args[++i];
  }

  if (!fromDir) {
    console.error("Usage: node scripts/restore.mjs --from <backupDir> [--project <name>] [--env-file <file>]");
    process.exit(1);
  }
  return { project, composeFile, envFile, fromDir: path.resolve(fromDir) };
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function main() {
  const { project, composeFile, envFile, fromDir } = parseArgs();
  const manifestPath = path.join(fromDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const dbDumpPath = path.join(fromDir, "db.sql");
  const mediaArchivePath = path.join(fromDir, "media.tar.gz");

  if (sha256File(dbDumpPath) !== manifest.files["db.sql"].sha256) {
    throw new Error("Checksum mismatch for db.sql! Aborting restore.");
  }
  if (sha256File(mediaArchivePath) !== manifest.files["media.tar.gz"].sha256) {
    throw new Error("Checksum mismatch for media.tar.gz! Aborting restore.");
  }
  console.log("[restore] Checksums verified against manifest.json.");

  console.log(`[restore] Restoring db.sql into compose project "${project}"...`);
  const sqlBytes = readFileSync(dbDumpPath);
  execFileSync(
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
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE"',
    ],
    { input: sqlBytes, maxBuffer: 256 * 1024 * 1024 },
  );

  const mediaVolume = `${project}_media_data`;
  console.log(`[restore] Restoring media.tar.gz into volume "${mediaVolume}"...`);
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${mediaVolume}:/media`,
      "-v",
      `${fromDir}:/backup:ro`,
      "alpine:3.21",
      "sh",
      "-c",
      "find /media -mindepth 1 -delete && tar xzf /backup/media.tar.gz -C /media && chown -R 1000:1000 /media",
    ],
    { stdio: "inherit" },
  );

  console.log(`[restore] Restore completed cleanly for project "${project}".`);
}

main();
