import React, { useState } from "react";
import { X, Building, User, Briefcase, Hash, Sparkles, Check, RotateCcw } from "lucide-react";

export interface PilotProfile {
  companyName: string;
  rcNumber: string;
  operatorName: string;
  operatorRole: string;
  currency: string;
  tenantId?: string;
}

interface PilotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: PilotProfile;
  onSave: (profile: PilotProfile) => void;
  /** Present only when the user has switched to a preset and a real workspace snapshot exists */
  onRestoreMyWorkspace?: () => void;
}

const PRESET_PILOTS: Array<{
  name: string;
  profile: PilotProfile;
  badge: string;
  datasetLabel: string;
}> = [
  {
    name: "Apex Superstores (Retail Chain)",
    badge: "Retail & POS",
    datasetLabel: "Dataset A",
    profile: {
      tenantId: "tenant-apex-001",
      companyName: "Apex Superstores & Logistics Nigeria Ltd",
      rcNumber: "RC-1849201",
      operatorName: "David Okoye",
      operatorRole: "Finance Lead",
      currency: "NGN (₦)",
    },
  },
  {
    name: "Alaba Wholesale Electronics",
    badge: "B2B Trade & Invoicing",
    datasetLabel: "Dataset B",
    profile: {
      tenantId: "tenant-alaba-002",
      companyName: "Alaba Prime Wholesale Electronics Ltd",
      rcNumber: "RC-948123",
      operatorName: "Chidi Anozie",
      operatorRole: "Chief Financial Officer",
      currency: "NGN (₦)",
    },
  },
  {
    name: "PayPulse Merchant Services",
    badge: "Fintech & PSP",
    datasetLabel: "Dataset A",
    profile: {
      tenantId: "tenant-apex-001",
      companyName: "PayPulse Solutions Nigeria Limited",
      rcNumber: "RC-2041992",
      operatorName: "Amina Bello",
      operatorRole: "Head of Settlement & Treasury",
      currency: "NGN (₦)",
    },
  },
  {
    name: "Kano Agro Commodities",
    badge: "Commodities & Bulk",
    datasetLabel: "Dataset B",
    profile: {
      tenantId: "tenant-alaba-002",
      companyName: "Sahel Agro Ventures Ltd",
      rcNumber: "RC-1102948",
      operatorName: "Ibrahim Danjuma",
      operatorRole: "Treasury Manager",
      currency: "NGN (₦)",
    },
  },
];

export const PilotSetupModal: React.FC<PilotSetupModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSave,
  onRestoreMyWorkspace,
}) => {
  const [profile, setProfile] = useState<PilotProfile>(currentProfile);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: PilotProfile) => {
    setProfile(preset);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate">Configure Pilot Demo</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">
                Personalize company, tenant isolation, and operator identity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs">

          {/* My Workspace Restore Banner — shown only while previewing a preset */}
          {onRestoreMyWorkspace && (
            <button
              type="button"
              onClick={onRestoreMyWorkspace}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer group"
            >
              <RotateCcw size={14} className="text-emerald-600 shrink-0 group-hover:rotate-[-45deg] transition-transform duration-300" />
              <div className="text-left">
                <p className="text-[11px] font-bold text-emerald-800">Return to My Workspace</p>
                <p className="text-[10px] text-emerald-600">Exit preset preview and restore your real tenant session</p>
              </div>
            </button>
          )}

          {/* Quick Presets */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              1-Click Industry Presets (Switch Isolated Tenant Database)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {PRESET_PILOTS.map((p) => {
                const isSelected = profile.companyName === p.profile.companyName;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p.profile)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900 text-xs sm:text-[11px] leading-tight">
                        {p.name}
                      </span>
                      {isSelected && <Check size={14} className="text-indigo-600 shrink-0 ml-1" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-500 font-medium">{p.badge}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                        {p.datasetLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>


          <div className="border-t border-slate-100 pt-4 space-y-3.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Custom Organization & Operator Details
            </label>

            {/* Company Name */}
            <div>
              <label className="text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                <Building size={13} className="text-slate-400" />
                <span>Company Legal Name</span>
              </label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                placeholder="e.g. Acme Logistics Nigeria Ltd"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
              />
            </div>

            {/* CAC Number & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" />
                  <span>CAC RC / BN Number</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.rcNumber}
                  onChange={(e) => setProfile({ ...profile, rcNumber: e.target.value })}
                  placeholder="e.g. RC-1849201"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                  <span>Operating Currency</span>
                </label>
                <input
                  type="text"
                  disabled
                  value="NGN (₦) · Nigerian Naira"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded text-slate-600 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* Operator Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  <span>Demo Operator Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.operatorName}
                  onChange={(e) => setProfile({ ...profile, operatorName: e.target.value })}
                  placeholder="e.g. David Okoye"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                  <Briefcase size={13} className="text-slate-400" />
                  <span>Operator Job Role</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.operatorRole}
                  onChange={(e) => setProfile({ ...profile, operatorRole: e.target.value })}
                  placeholder="e.g. Finance Lead / CFO"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium transition-colors text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold transition-colors shadow-xs text-center cursor-pointer"
            >
              Apply to Demo Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
