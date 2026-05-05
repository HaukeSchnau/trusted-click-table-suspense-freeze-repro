# Investigation Notes

## Current Minimal Shape

The repro is now a single React component with:

1. One button that synchronously calls `setActive(true)`.
2. `useReactTable({ data: active ? [null] : [], columns, getCoreRowModel })`.
3. Stable empty `columns` and stable `getCoreRowModel()`.
4. A render-time read of `table.getRowModel().rows.length`.
5. One child component mounted when that length is non-zero.
6. That child throws a one-shot Promise that resolves via `setTimeout(resolve)`.
7. The child is wrapped in `<Suspense fallback={null}>`.

No production app, network API, cookies, auth state, TanStack Router, TanStack Query, CSS, nested
route, React Compiler, Vite React plugin, StrictMode, visible watchdog, table DOM, non-empty table
columns, row fields, row mapping, table headers, sorting, or extra UI controls remain.

## Tested Reductions

| Change | Result |
| --- | --- |
| Plain React state instead of TanStack Router search navigation | Still freezes |
| No TanStack Router dependency at all | Still freezes |
| Hand-written Suspense promise instead of TanStack Query | Still freezes |
| No TanStack Query dependency at all | Still freezes |
| Explicit `<Suspense fallback={null}>` boundary | Still freezes |
| Plain React state plus the same Suspense child, with no TanStack Table | Responsive |
| Call `useReactTable` but render from state instead of `table.getRowModel()` | Responsive |
| Read only `table.getRowModel().rows.length` | Still freezes |
| Stable `columns` and stable `getCoreRowModel()` | Still freezes |
| Stable active/inactive table data arrays | Responsive |
| Fresh `data: active ? [null] : []` | Still freezes |
| `[null]` as the active table data | Still freezes |
| Zero-delay timer in the suspender | Still freezes |
| Immediate render with no async suspension | Responsive |
| Remove StrictMode, CSS, React Compiler, and Vite React plugin | Still freezes |

## Interpretation

The bug is not Buildlinx-specific, not Router-specific, and not Query-specific. The smallest
observed trigger is:

trusted click -> synchronous React state update -> fresh TanStack Table data -> TanStack Table row
model is read -> React Suspense child suspends on a timer.

The strongest current lead is the boundary between TanStack Table row-model consumption over a
fresh `data` array and React's handling of a suspending subtree during the trusted click task.
