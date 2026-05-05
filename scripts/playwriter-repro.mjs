import { spawn, spawnSync } from "node:child_process";

const baseUrl = process.env.REPRO_URL ?? "http://127.0.0.1:4174";
const session = process.env.PLAYWRITER_SESSION ?? "5";

async function waitForPreview() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the preview server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Preview server did not respond at ${baseUrl}`);
}

const preview = spawn("pnpm", ["preview:repro"], {
  detached: true,
  stdio: "ignore",
});

let exitCode = 1;
try {
  await waitForPreview();

  const code = `
state.page = await context.newPage();
await state.page.goto(${JSON.stringify(baseUrl)}, { waitUntil: "domcontentloaded", timeout: 10000 });
const box = await state.page.locator("#sync-active").boundingBox();
if (!box) throw new Error("Could not find repro button");
await state.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await state.page.mouse.down();
const upResult = await Promise.race([
  state.page.mouse.up().then(() => ({ upReturned: true })).catch((error) => ({
    upReturned: false,
    error: error.message,
  })),
  new Promise((resolve) => setTimeout(() => resolve({ upRaceTimedOut: true }), 8000)),
]);
console.log(JSON.stringify({
  baseUrl: ${JSON.stringify(baseUrl)},
  ok: Boolean(upResult.upRaceTimedOut),
  result: {
    label: "synchronous active row render",
    expected: "freeze",
    actual: upResult.upRaceTimedOut ? "freeze" : "responsive",
    clickTimedOut: Boolean(upResult.upRaceTimedOut),
    upResult,
  },
}, null, 2));
`;

  const result = spawnSync(
    "npx",
    ["-y", "playwriter@latest", "-s", session, "-e", code, "--timeout", "15000"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  exitCode = result.status ?? 1;
} finally {
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    // The process may already have exited.
  }
  spawnSync(
    "bash",
    ["-lc", "sleep 0.5; pids=$(lsof -tiTCP:4174 -sTCP:LISTEN); [ -z \"$pids\" ] || kill $pids"],
    {
      stdio: "ignore",
    },
  );
}

process.exit(exitCode);
