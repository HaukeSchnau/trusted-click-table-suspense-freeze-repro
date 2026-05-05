import { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

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

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(<App />);
