# Trusted Click Table/Suspense Freeze Repro

Standalone minimal repro for a Chrome renderer freeze involving React Suspense and TanStack Table's
row model.

The repro uses only local React state, fresh local table data, one TanStack Table row-model read, and
a hand-written Suspense promise. It does not depend on any production app, route, auth state,
cookies, APIs, TanStack Router, TanStack Query, React Compiler, or Vite React plugin.

## Environment

- React `19.2.3`
- `@tanstack/react-table` `8.21.3`
- Vite `7.3.0`
- Chrome with a real pointer event driven through Playwriter

## Reproduction

```sh
git clone https://github.com/HaukeSchnau/trusted-click-table-suspense-freeze-repro.git
cd trusted-click-table-suspense-freeze-repro
pnpm install
pnpm check
PLAYWRITER_SESSION=<your-playwriter-session-id> pnpm repro
```

Expected output:

```json
{
  "baseUrl": "http://127.0.0.1:4174",
  "ok": true,
  "result": {
    "label": "synchronous active row render",
    "expected": "freeze",
    "actual": "freeze",
    "clickTimedOut": true
  }
}
```

Manual repro:

```sh
pnpm preview:repro
```

Then open `http://127.0.0.1:4174/` in Chrome and click `Synchronous active row`.

## Reduced Trigger

```tsx
const columns: [] = [];
const coreRowModel = getCoreRowModel();
let resolved = false;
let promise: Promise<void> | undefined;

function Suspender() {
  if (!resolved) {
    promise ??= new Promise((resolve) => {
      window.setTimeout(() => {
        resolved = true;
        resolve();
      });
    });

    throw promise;
  }

  return null;
}

function App() {
  const [active, setActive] = useState(false);
  const table = useReactTable({
    data: active ? [null] : [],
    columns,
    getCoreRowModel: coreRowModel,
  });

  return (
    <>
      {table.getRowModel().rows.length ? (
        <Suspense fallback={null}>
          <Suspender />
        </Suspense>
      ) : null}
      <button id="sync-active" onClick={() => setActive(true)}>
        Synchronous active row
      </button>
    </>
  );
}
```

## Failure Signal

The Playwriter oracle performs a real Chrome mouse-down/mouse-up sequence on the button with an
8 second timeout. In the failing case, `page.mouse.up()` never returns before the timeout, which
indicates that the renderer event loop is frozen.
