"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, variant = "default", duration = 5000) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              {...fadeUp}
              transition={fadeUpTransition}
              className={`pointer-events-auto px-4 py-3 rounded-md border text-sm leading-relaxed ${
                t.variant === "success"
                  ? "bg-surface border-success/30 text-success"
                  : t.variant === "error"
                    ? "bg-surface border-error/30 text-error"
                    : t.variant === "pending"
                      ? "bg-surface border-pending/30 text-pending"
                      : "bg-surface border-border text-text"
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
