import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  ChevronRight, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  IndianRupee
} from "lucide-react";
import toast from "react-hot-toast";

interface Charge {
  name: string;
  amount: number;
}

interface MaintenancePlan {
  _id: string;
  planName: string;
  billingCycle: "Monthly" | "Quarterly" | "Yearly";
  charges: Charge[];
  status: "Active" | "Inactive";
  createdAt: string;
}

export const MaintenancePlans: React.FC = () => {
  const { token } = useAuth();
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Quarterly" | "Yearly">("Monthly");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [charges, setCharges] = useState<Charge[]>([{ name: "General Maintenance", amount: 1500 }]);
  
  // Validation/Submit Loading State
  const [isSaving, setIsSaving] = useState(false);

  // Fetch plans
  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/maintenance-plans`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
      } else {
        toast.error(data.error || "Failed to load plans.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading plans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPlans();
    }
  }, [token]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setPlanName("");
    setBillingCycle("Monthly");
    setStatus("Active");
    setCharges([{ name: "General Maintenance", amount: 1500 }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: MaintenancePlan) => {
    setEditingId(plan._id);
    setPlanName(plan.planName);
    setBillingCycle(plan.billingCycle);
    setStatus(plan.status);
    setCharges(plan.charges && plan.charges.length > 0 ? [...plan.charges] : [{ name: "", amount: 0 }]);
    setIsModalOpen(true);
  };

  const handleAddChargeField = () => {
    setCharges([...charges, { name: "", amount: 0 }]);
  };

  const handleRemoveChargeField = (index: number) => {
    if (charges.length === 1) {
      toast.error("At least one charge component is required.");
      return;
    }
    setCharges(charges.filter((_, i) => i !== index));
  };

  const handleChargeChange = (index: number, field: keyof Charge, value: any) => {
    const updated = [...charges];
    if (field === "amount") {
      updated[index].amount = Math.max(0, Number(value) || 0);
    } else {
      updated[index].name = value;
    }
    setCharges(updated);
  };

  const calculateTotal = (chargeList: Charge[]) => {
    return chargeList.reduce((sum, c) => sum + (c.amount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error("Please enter a plan name.");
      return;
    }

    // Validate charges
    const invalidCharge = charges.some(c => !c.name.trim() || c.amount <= 0);
    if (invalidCharge) {
      toast.error("Please enter a valid name and positive amount for all charge components.");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId 
        ? `/api/v1/society-management/maintenance-plans/${editingId}`
        : "/api/v1/society-management/maintenance-plans";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          planName: planName.trim(),
          billingCycle,
          charges,
          status
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Plan updated successfully!" : "Maintenance plan created successfully!");
        setIsModalOpen(false);
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to save plan.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error while saving plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this maintenance plan?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/maintenance-plans/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Plan deleted successfully!");
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to delete plan.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error during deletion.");
    }
  };

  return (
    <div id="maintenance-plans-view" className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-gray-150 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <span>Society Maintenance Plans</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure recurring bill templates, general maintenance levies, and dynamic charge breakdowns.
          </p>
        </div>
        <button
          id="btn-create-plan"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Plan Template</span>
        </button>
      </div>

      {/* Main Grid List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-xl">
          <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
          <span className="text-xs text-gray-500 mt-2 font-mono">Retrieving active configurations...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-gray-250 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No Maintenance Plans Configured</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            You must set up at least one plan template with charge elements before you can generate monthly resident utility and maintenance invoices.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow transition-colors cursor-pointer"
          >
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const total = calculateTotal(plan.charges);
            return (
              <div 
                key={plan._id} 
                id={`plan-card-${plan._id}`}
                className="bg-white border border-gray-150 hover:border-gray-300 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between transition-all"
              >
                {/* Header info */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded uppercase font-mono ${
                      plan.status === "Active" 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {plan.status}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 font-mono">
                      {plan.billingCycle}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mt-2.5 truncate">
                    {plan.planName}
                  </h3>
                </div>

                {/* Charges List */}
                <div className="p-5 bg-gray-50 flex-1 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Charge Breakdown</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {plan.charges.map((charge, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 truncate">{charge.name}</span>
                        <span className="font-mono text-gray-800">₹{charge.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total & Action Footer */}
                <div className="p-5 border-t border-gray-100 bg-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Total Levy</span>
                    <span className="text-lg font-bold text-gray-900 font-mono">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      id={`btn-edit-plan-${plan._id}`}
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-plan-${plan._id}`}
                      onClick={() => handleDeletePlan(plan._id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div id="plan-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">
                {editingId ? "Modify Plan Template" : "New Plan Template"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Plan name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Template/Plan Name *</label>
                <input 
                  type="text" 
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. FY 2026 Monthly General Levy"
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                  required
                />
              </div>

              {/* Cycle & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 block">Billing Cycle *</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 block">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Charges Setup */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 block uppercase tracking-wide">Levy Components</span>
                  <button
                    type="button"
                    onClick={handleAddChargeField}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 hover:text-black hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Component</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {charges.map((charge, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text"
                        value={charge.name}
                        onChange={(e) => handleChargeChange(idx, "name", e.target.value)}
                        placeholder="Component Name (e.g. Security Fund)"
                        className="flex-1 text-xs p-2 bg-white border border-gray-300 rounded focus:outline-none focus:border-slate-900 font-sans"
                        required
                      />
                      <div className="w-32 flex items-center border border-gray-300 rounded px-2 bg-white focus-within:border-slate-900">
                        <span className="text-gray-400 text-[11px] mr-1">₹</span>
                        <input 
                          type="number"
                          value={charge.amount || ""}
                          onChange={(e) => handleChargeChange(idx, "amount", e.target.value)}
                          placeholder="Amount"
                          className="w-full text-xs p-1 bg-transparent focus:outline-none font-mono"
                          min="1"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChargeField(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Combined Total Preview */}
                <div className="p-3 bg-slate-900 text-white rounded-lg flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Template Levy:</span>
                  <span className="font-mono font-bold text-base">₹{calculateTotal(charges).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 rounded-lg shadow cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Template...</span>
                    </>
                  ) : (
                    <span>Save Template</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
