import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-md border shadow-sm text-xs font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : toast.type === "warning"
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : toast.type === "error"
              ? "bg-rose-50 text-rose-900 border-rose-200"
              : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />}
          {toast.type === "warning" && <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />}
          {toast.type === "error" && <XCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />}
          {toast.type === "info" && <HelpCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />}
          <span className="leading-relaxed">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
