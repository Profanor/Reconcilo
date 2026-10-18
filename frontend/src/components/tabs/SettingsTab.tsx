import React from "react";
import type { ReconciliationRule } from "../../api";

interface SettingsTabProps {
  operatorName: string;
  setOperatorName: (name: string) => void;
  rules: ReconciliationRule[];
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  operatorName,
  setOperatorName,
  rules,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Workspace Profile */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Workspace & Organization Profile</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-500 font-medium block mb-1">Company Legal Name</label>
            <input
              type="text"
              disabled
              value="Apex Superstores & Logistics Nigeria Ltd"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">CAC Registration (RC)</label>
            <input
              type="text"
              disabled
              value="RC-1849201"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">Operating Currency</label>
            <input
              type="text"
              disabled
              value="NGN (₦) - Nigerian Naira"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 font-semibold"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">Active Operator</label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Matching Rules Configuration */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Reconciliation Rules Engine</h3>
            <p className="text-xs text-slate-500">
              Rules priority sequence executed during batch and auto-reconciliation
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <span>{rule.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                    Priority {rule.priority}
                  </span>
                  {rule.priority >= 8 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Auto-Match
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Requires Confirmation
                    </span>
                  )}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">{rule.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
