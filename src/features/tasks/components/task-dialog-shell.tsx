"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function TaskDialogShell({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      aria-modal="true"
      className="fixed inset-0 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-slate-950/40"
      onCancel={(event) => {
        event.preventDefault();
        void onClose();
      }}
    >
      {children}
    </dialog>
  );
}
