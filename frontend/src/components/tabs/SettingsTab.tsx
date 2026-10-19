import React from "react";
import type { ReconciliationRule } from "../../api";
import { Sparkles } from "lucide-react";

interface SettingsTabProps {
  companyName: string;
  setCompanyName: (name: string) => void;
  rcNumber: string;
  setRcNumber: (rc: string) => void;
  operatorName: string;
  setOperatorName: (name: string) => void;
  operatorRole: string;
  setOperatorRole: (role: string) => void;
  onOpenPilotSetup: () => void;
  rules: ReconciliationRule[];
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  companyName,
  setCompanyName,
  rcNumber,
  setRcNumber,
  operatorName,
  setOperatorName,
  operatorRole,
  setOperatorRole,
  onOpenPilotSetup,
  rules,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Workspace Profile */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Workspace & Organization Profile</h3>
            <p className="text-xs text-slate-500">
              Identity parameters stamped onto audit trails, ledger actions, and certified reports
            </p>
          </div>
          <button
            onClick={onOpenPilotSetup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Preset Pilot Switcher</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-500 font-medium block mb-1">Company Legal Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Superstores Ltd"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">CAC Registration (RC/BN)</label>
            <input
              type="text"
              value={rcNumber}
              onChange={(e) => setRcNumber(e.target.value)}
              placeholder="e.g. RC-1849201"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">Active Operator Name</label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="e.g. David Okoye"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">Operator Job Title / Role</label>
            <input
              type="text"
              value={operatorRole}
              onChange={(e) => setOperatorRole(e.target.value)}
              placeholder="e.g. Finance Lead / CFO"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium outline-none focus:border-slate-500 transition-colors"
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
