"use client";

import * as React from "react";

export type ToastVariant = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function toast(input: Omit<ToastItem, "id">) {
  const id = Math.random().toString(36).slice(2, 10);
  toasts = [...toasts, { id, ...input }];
  emit();
  setTimeout(() => dismissToast(id), 3200);
  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const [items, setItems] = React.useState<ToastItem[]>(toasts);

  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return { toasts: items, toast, dismiss: dismissToast };
}
