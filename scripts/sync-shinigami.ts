import "dotenv/config";
import { closeDb } from "../src/db";
import { getShinigamiSyncConfig } from "../src/lib/env";
import { runShinigamiSync } from "../src/lib/shinigami-sync";

const args = new Set(process.argv.slice(2));
const watchMode = args.has("--watch");
const fullMode = args.has("--full");

let stopping = false;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;

function handleSignal(signal: string) {
  console.log(JSON.stringify({ event: "sync_stopping", signal }));
  stopping = true;
  if (sleepTimer) {
    clearTimeout(sleepTimer);
    sleepTimer = null;
  }
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

async function interruptibleSleep(ms: number): Promise<void> {
  if (stopping || ms <= 0) return;
  await new Promise<void>((resolve) => {
    sleepTimer = setTimeout(() => {
      sleepTimer = null;
      resolve();
    }, ms);
  });
}

async function runOnce(mode: "incremental" | "full") {
  try {
    const report = await runShinigamiSync({ mode });
    console.log(JSON.stringify({ event: "sync_complete", ...report }));
    return report;
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "sync_error",
        mode,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return null;
  }
}

async function main() {
  const cfg = getShinigamiSyncConfig();

  if (!watchMode) {
    const report = await runOnce(fullMode ? "full" : "incremental");
    await closeDb();
    process.exit(report && report.ok ? 0 : 1);
  }

  console.log(
    JSON.stringify({
      event: "sync_worker_started",
      intervalMinutes: cfg.intervalMinutes,
      latestPages: cfg.latestPages,
      requestDelayMs: cfg.requestDelayMs,
      maxSeriesChapterFetch: cfg.maxSeriesChapterFetch,
      initialMode: fullMode ? "full" : "incremental",
    }),
  );

  // Brief startup delay so web & db settle first
  await interruptibleSleep(5_000);

  let firstRun = true;
  while (!stopping) {
    const mode = firstRun && fullMode ? "full" : "incremental";
    firstRun = false;
    await runOnce(mode);
    if (stopping) break;
    await interruptibleSleep(cfg.intervalMinutes * 60 * 1000);
  }

  await closeDb();
  console.log(JSON.stringify({ event: "sync_worker_stopped" }));
}

main().catch(async (err) => {
  console.error("Fatal sync error:", err instanceof Error ? err.message : err);
  await closeDb().catch(() => {});
  process.exit(1);
});
