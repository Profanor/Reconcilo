import React, { useState } from "react";
import { X } from "lucide-react";

interface AddExpectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reference: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    description: string;
  }) => Promise<void>;
}

export const AddExpectedModal: React.FC<AddExpectedModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!ref.trim()) errs.reference = "Reference / Order ID is required";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      errs.amount = "A valid positive amount is required";
    }
    if (!customer.trim()) errs.customerName = "Customer name is required";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        reference: ref.trim(),
        amount: Number(amount),
        customerName: customer.trim(),
        customerPhone: phone.trim(),
        description: desc.trim(),
      });
      setRef("");
      setAmount("");
      setCustomer("");
      setPhone("");
      setDesc("");
      setErrors({});
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Add Expected Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Order Reference / Invoice ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ORD-2026-0099"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
            {errors.reference && <p className="text-rose-600 text-[11px] mt-1">{errors.reference}</p>}
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Expected Amount (NGN) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 45000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
            {errors.amount && <p className="text-rose-600 text-[11px] mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Customer Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fatima Aliyu"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
            {errors.customerName && (
              <p className="text-rose-600 text-[11px] mt-1">{errors.customerName}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Customer Phone Number</label>
            <input
              type="text"
              placeholder="e.g. 08023456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Order Memo / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. 2x Designer Sneakers (Lekki Branch)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs"
            >
              {submitting ? "Saving..." : "Save Expected Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
