import { execFile } from "node:child_process";

const baseUrl = process.env.REPRO_URL ?? "http://127.0.0.1:4174";
const clickTimeoutMs = 8_000;

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = execFile(command, args, options, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });

    if (options.timeout) {
      setTimeout(() => child.kill("SIGKILL"), options.timeout).unref();
    }
  });
}

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

await waitForPreview();
await run("agent-browser", ["close"], { timeout: 1_000 });

const opened = await run("agent-browser", ["open", baseUrl], { timeout: 5_000 });
if (opened.error) {
  throw new Error(opened.stderr || opened.stdout || opened.error.message);
}

const snapshot = await run("agent-browser", ["snapshot", "-i"], { timeout: 5_000 });
const match = snapshot.stdout.match(/Synchronous active row[^\n]*(?:@|ref=)(e\d+)/);
if (!match) {
  throw new Error(`Could not find repro button.\n${snapshot.stdout}\n${snapshot.stderr}`);
}

const click = await run("agent-browser", ["click", `@${match[1]}`], {
  timeout: clickTimeoutMs,
});
const clickTimedOut = Boolean(click.error?.killed || click.error?.signal === "SIGKILL");
const actual = clickTimedOut ? "freeze" : "responsive";
const ok = actual === "freeze";

console.log(
  JSON.stringify(
    {
      baseUrl,
      ok,
      result: {
        label: "synchronous active row render",
        expected: "freeze",
        actual,
        clickTimedOut,
      },
    },
    null,
    2,
  ),
);

await run("agent-browser", ["close"], { timeout: 1_000 });
process.exit(ok ? 0 : 1);
