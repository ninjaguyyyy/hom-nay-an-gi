"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (item: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...item, id }]);

    window.setTimeout(() => {
      removeToast(id);
    }, 2800);
  }, [removeToast]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto w-[calc(100%-1.5rem)] max-w-md space-y-2">
        {toasts.map((item) => {
          const variant = item.variant ?? "info";

          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto animate-pop-in rounded-2xl border px-4 py-3 shadow-lg",
                variant === "success" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                variant === "error" && "border-rose-200 bg-rose-50 text-rose-800",
                variant === "info" && "border-slate-200 bg-white text-slate-800",
              )}
            >
              <div className="flex items-start gap-2">
                {variant === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                ) : null}
                {variant === "error" ? (
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                ) : null}
                {variant === "info" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-500" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs opacity-90">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="rounded-full p-1 opacity-70 transition hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
