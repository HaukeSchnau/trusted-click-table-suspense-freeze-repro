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
- Chrome

## Reproduction

```sh
git clone https://github.com/HaukeSchnau/trusted-click-table-suspense-freeze-repro.git
cd trusted-click-table-suspense-freeze-repro
pnpm install
pnpm check
pnpm preview:repro
```

Then open `http://127.0.0.1:4174/` in Chrome and click `Synchronous active row`.

Expected: the click completes and the page remains responsive.

Actual: the Chrome tab freezes during the click.

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

After clicking `Synchronous active row`, the Chrome tab stops responding. Reloading or closing the
tab is required to recover.
