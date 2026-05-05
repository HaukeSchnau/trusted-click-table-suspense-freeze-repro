# Trusted Click Table/Suspense Freeze Repro

Standalone minimal repro for a Chrome renderer freeze. It uses only local React state, a one-row
TanStack Table instance, and a hand-written React Suspense promise. It does not load, call, inject
into, or depend on the Buildlinx production app.

## Shape

- React `19.2.3`
- TanStack Table `8.21.3`
- Vite production build
- one trusted click that synchronously calls `setState(true)`
- fresh `[]` / `[null]` table data arrays created during render
- stable empty `columns` and stable `getCoreRowModel()`
- `table.getRowModel().rows.length` decides whether to mount one suspending child
- the child suspends by throwing a promise that resolves through zero-delay `setTimeout`

No TanStack Router, TanStack Query, table DOM, non-empty columns, row mapping, row object fields,
app data, CSS, React StrictMode, React Compiler, Vite React plugin, or production app code remains.

## Run

```sh
pnpm install
pnpm check
PLAYWRITER_SESSION=5 pnpm repro
```

Use any Playwriter session id that is connected to Chrome; `5` is the local session used while
restoring this repro. The Playwriter script starts the Vite preview, opens
`http://127.0.0.1:4174/`, and passes only when the real browser `mouse.up` times out because the
renderer freezes.

Optional headless `agent-browser` harness:

```sh
pnpm repro:agent-browser
```

That channel is useful for comparison, but in the current browser set it reports responsive while
Playwriter against Chrome reproduces the freeze.

## Manual Check

Open `http://127.0.0.1:4174/` and click `Synchronous active row`. The tab freezes during the click.
