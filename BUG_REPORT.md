# Chrome Renderer Freeze With React Suspense And TanStack Table Row Model

## Summary

A Vite production build can freeze the Chrome renderer when a trusted pointer click synchronously
updates React state, passes a fresh one-row `data` array into TanStack Table, reads
`table.getRowModel().rows.length`, and mounts a child that suspends on a timer.

This repository is standalone. It uses local state and local data only. It does not depend on any
production route, auth state, cookies, APIs, external app bundle, TanStack Router, TanStack Query,
React Compiler, or Vite React plugin.

## Environment

- Chrome with a real pointer event driven through `agent-browser` or Playwriter
- React `19.2.3`
- `@tanstack/react-table` `8.21.3`
- Vite `7.3.0`

## Reproduction

```sh
cd ~/Code/trusted-click-table-suspense-freeze-repro
pnpm install
pnpm check
PLAYWRITER_SESSION=5 pnpm repro
```

Expected result:

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

## Reduced Trigger

The current application code is intentionally tiny:

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
8 second timeout. In the failing case, `page.mouse.up()` never returns before the timeout:

```json
{
  "actual": "freeze",
  "clickTimedOut": true
}
```

That indicates the renderer event loop is frozen. A headless `agent-browser` harness is included for
comparison, but in the current local browser set it reports responsive while Playwriter against
Chrome reproduces the freeze.

## Minimality Checks

These reductions were tested:

| Change | Result |
| --- | --- |
| Remove TanStack Router entirely and use plain React state | Still freezes |
| Remove TanStack Query and use a hand-written thrown timer promise | Still freezes |
| Add an explicit `<Suspense fallback={null}>` boundary | Still freezes |
| Replace TanStack Table with plain React state plus the same Suspense child | Responsive |
| Initialize TanStack Table but ignore `table.getRowModel()` | Responsive |
| Consume only `table.getRowModel().rows.length`; no row map/rendered table DOM | Still freezes |
| Use stable `columns` and stable `getCoreRowModel()` | Still freezes |
| Pass stable active/inactive data arrays instead of fresh arrays | Responsive |
| Use `[null]` as the only row; no row object fields | Still freezes |
| Use zero-delay `setTimeout` in the suspender | Still freezes |
| Remove async suspension and render immediately | Responsive |
| Remove React StrictMode | Still freezes |
| Remove React Compiler | Still freezes |
| Remove Vite React plugin | Still freezes |
| Remove all CSS and visible watchdog UI | Still freezes |

Current likely ownership area: the interaction between React's trusted click update/render work,
TanStack Table row-model consumption over fresh `data`, and React Suspense on an async timer.
