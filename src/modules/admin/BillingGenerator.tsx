import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { 
  Plus, 
  Trash2, 
  Eye, 
  FileText, 
  X, 
  Loader2, 
  IndianRupee, 
  CreditCard, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ChevronDown,
  Search,
  Filter
} from "lucide-react";
import toast from "react-hot-toast";

interface Charge {
  name: string;
  amount: number;
}

interface MaintenancePlan {
  _id: string;
  planName: string;
  charges: Charge[];
  status: "Active" | "Inactive";
}

interface MaintenanceBill {
  _id: string;
  billNumber: string;
  planName: string;
  billingMonth: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  flatNumber: string;
  buildingName: string;
  residentName: string;
  charges: Charge[];
  createdAt: string;
}

export const BillingGenerator: React.FC = () => {
  const { token } = useAuth();
  
  // Data lists
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  
  // Loadings
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  
  // Billing Generator Form state
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingMonth, setBillingMonth] = useState("July 2026");
  const [dueDate, setDueDate] = useState("2026-07-31");
  
  // Modals state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MaintenanceBill | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  
  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<MaintenanceBill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Bank Transfer" | "Cheque">("Cash");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Load plans & bills
  const loadData = async () => {
    setIsPageLoading(true);
    try {
      // 1. Fetch Plans
      const plansRes = await fetch("/api/v1/society-management/maintenance-plans", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const plansData = await plansRes.json();
      if (plansData.success) {
        const activePlans = (plansData.plans || []).filter((p: any) => p.status === "Active");
        setPlans(activePlans);
        if (activePlans.length > 0) {
          setSelectedPlanId(activePlans[0]._id);
        }
      }

      // 2. Fetch Bills
      const billsRes = await fetch("/api/v1/society-management/maintenance-bills", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const billsData = await billsRes.json();
      if (billsData.success) {
        setBills(billsData.bills || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync billing dashboard state.");
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Generate monthly billing action
  const handleGenerateBills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error("Please select an active maintenance plan template first.");
      return;
    }
    if (!billingMonth) {
      toast.error("Please specify the billing month.");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a valid payment due date.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/v1/society-management/maintenance-bills/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          billingMonth,
          dueDate
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Monthly bills generated successfully!");
        loadData();
      } else {
        toast.error(data.error || "Failed to generate monthly bills.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating maintenance bills.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Details Modal with Receipt Fetching
  const handleOpenDetailModal = async (bill: MaintenanceBill) => {
    setSelectedBill(bill);
    setIsDetailModalOpen(true);
    setReceiptDetails(null);
    
    if (bill.status === "Paid" || bill.paidAmount > 0) {
      setIsReceiptLoading(true);
      try {
        const res = await fetch(`/api/v1/society-management/maintenance-bills/${bill._id}/receipt`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setReceiptDetails(data);
        }
      } catch (e) {
        console.warn("Could not load payment receipt details.", e);
      } finally {
        setIsReceiptLoading(false);
      }
    }
  };

  // Record manual Payment Modal open
  const handleOpenPaymentModal = (bill: MaintenanceBill) => {
    setPaymentBill(bill);
    setPayAmount(bill.outstandingAmount);
    setPaymentMethod("Cash");
    setReferenceId("");
    setNotes("");
    setIsPaymentModalOpen(true);
  };

  // Submit manual payment recording
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill) return;

    if (payAmount <= 0) {
      toast.error("Payment amount must be greater than zero.");
      return;
    }
    if (payAmount > paymentBill.outstandingAmount) {
      toast.error(`Payment amount cannot exceed the remaining outstanding amount of ₹${paymentBill.outstandingAmount}.`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`/api/v1/society-management/maintenance-bills/${paymentBill._id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod,
          amount: payAmount,
          referenceId,
          notes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Payment recorded successfully!");
        setIsPaymentModalOpen(false);
        loadData();
      } else {
        toast.error(data.error || "Failed to record payment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while recording payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Delete/Cancel Bill
  const handleDeleteBill = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete/cancel this generated bill? This will permanently remove the invoice from the resident's account if unpaid.")) return;

    try {
      const res = await fetch(`/api/v1/society-management/maintenance-bills/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Bill cancelled and deleted successfully.");
        loadData();
      } else {
        toast.error(data.error || "Failed to cancel bill.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error during deletion.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtering Logic
  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.flatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.buildingName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || bill.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="billing-generator-view" className="space-y-6">
      {/* Banner Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-gray-150 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-700" />
            <span>Generate Society Maintenance Billing</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Trigger bulk invoice cycles for all registered flats and review historical billing entries.
          </p>
        </div>
      </div>

      {/* Trigger generator form & instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bulk Bill Generator form card */}
        <div className="lg:col-span-2 bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-slate-700" />
            <span>Bulk Invoice Generation</span>
          </h2>
          {plans.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <strong>Action Needed:</strong> There are no active Maintenance Plan templates. Please configure at least one active plan template under the "Maintenance Plans" section before launching a billing invoice cycle.
            </div>
          ) : (
            <form onSubmit={handleGenerateBills} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Select Active Plan Template *</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900"
                  required
                >
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>{p.planName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Billing Month/Year *</label>
                <input
                  type="text"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  placeholder="e.g. July 2026"
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Due Date for Residents *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-3 pt-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 justify-center w-full px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 rounded-lg shadow cursor-pointer transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing generation pipeline (mapping flats)...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Execute Bulk billing for all flats</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick Help box */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">How Billing Works</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              When you generate bills:
            </p>
            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside leading-relaxed">
              <li>Our engine scans all flats in the society database.</li>
              <li>Calculates a sum of the individual charge components.</li>
              <li>Maps the resident profile as invoice recipient.</li>
              <li>Generates an individual <strong>BILL-YYYYMM-XXXXXX</strong> statement ready for local payment or resident self-checkout.</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-150 text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Saves local persist state securely</span>
          </div>
        </div>
      </div>

      {/* Bill History log review section */}
      <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm">
        {/* Table Header Filter panel */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Historical Billing Logs</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flat, name, bill #..."
                className="w-full text-xs p-2 bg-white pl-9 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
              />
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900"
            >
              <option value="All">All Bills</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        {/* Generated bills table */}
        {isPageLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <span className="text-xs text-gray-500 mt-2 font-mono">Syncing billing ledger...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            No maintenance bills matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/55 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase">
                  <th className="p-4">Bill Number</th>
                  <th className="p-4">Billing Month</th>
                  <th className="p-4">Flat Info</th>
                  <th className="p-4">Resident</th>
                  <th className="p-4">Levy (₹)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono font-semibold text-gray-800">{bill.billNumber}</td>
                    <td className="p-4 text-gray-600">{bill.billingMonth}</td>
                    <td className="p-4 text-gray-700">
                      {bill.buildingName} - <span className="font-semibold">{bill.flatNumber}</span>
                    </td>
                    <td className="p-4 text-gray-600">{bill.residentName || "Unassigned"}</td>
                    <td className="p-4 font-mono text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-semibold">₹{bill.totalAmount.toFixed(2)}</span>
                        {bill.outstandingAmount > 0 && (
                          <span className="text-[10px] text-red-500">Out: ₹{bill.outstandingAmount.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider font-mono ${
                        bill.status === "Paid" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : bill.status === "Partially Paid" 
                          ? "bg-amber-50 text-amber-700" 
                          : "bg-rose-50 text-rose-700"
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          id={`btn-view-bill-${bill._id}`}
                          onClick={() => handleOpenDetailModal(bill)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded hover:border-slate-900 transition-colors cursor-pointer"
                          title="View Statement Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Statement</span>
                        </button>
                        
                        {bill.status !== "Paid" && (
                          <button
                            id={`btn-pay-bill-admin-${bill._id}`}
                            onClick={() => handleOpenPaymentModal(bill)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs cursor-pointer"
                            title="Record Cash/Cheque Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        )}

                        {bill.status === "Pending" && (
                          <button
                            id={`btn-delete-bill-${bill._id}`}
                            onClick={() => handleDeleteBill(bill._id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Cancel Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Statement Detail Modal */}
      {isDetailModalOpen && selectedBill && (
        <div id="bill-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 no-print">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Bill Invoice Breakdown</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Friendly Statement Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 print-container" id="printable-statement">
              {/* Invoice Top Header */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">NeighbourLink Society</h1>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Statement of Dues</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase font-mono rounded ${
                    selectedBill.status === "Paid" 
                      ? "bg-emerald-50 text-emerald-700" 
                      : selectedBill.status === "Partially Paid"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              {/* Bill Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-150 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Billing For</span>
                  <span className="text-xs font-semibold text-gray-800 block">
                    {selectedBill.residentName || "Resident"}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Flat {selectedBill.flatNumber}, {selectedBill.buildingName}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Statement Details</span>
                  <span className="text-xs font-semibold text-gray-800 block">
                    Invoice: <span className="font-mono font-bold text-[11px]">{selectedBill.billNumber}</span>
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Period: {selectedBill.billingMonth}
                  </span>
                  <span className="text-xs text-rose-600 font-semibold block">
                    Due By: {selectedBill.dueDate}
                  </span>
                </div>
              </div>

              {/* Itemized charges table */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Itemized Ledger Components</h3>
                <div className="border border-gray-150 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-150">
                        <th className="p-3">Component Description</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBill.charges && selectedBill.charges.map((charge, idx) => (
                        <tr key={idx}>
                          <td className="p-3 text-gray-700 font-medium">{charge.name}</td>
                          <td className="p-3 text-right font-mono text-gray-900">₹{charge.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold border-t border-gray-200">
                        <td className="p-3">TOTAL ASSESSED AMOUNT</td>
                        <td className="p-3 text-right font-mono">₹{selectedBill.totalAmount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payments History log breakdown inside statement */}
              {selectedBill.paidAmount > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payments History Ledger</h3>
                  {isReceiptLoading ? (
                    <div className="flex justify-center p-3">
                      <Loader2 className="w-5 h-5 text-slate-800 animate-spin" />
                    </div>
                  ) : receiptDetails && receiptDetails.payment ? (
                    <div className="border border-gray-150 rounded-lg p-3 text-xs bg-gray-50/50 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-gray-700">
                        <span>Receipt ID:</span>
                        <span className="font-mono">{receiptDetails.receipt?.receiptNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Amount Paid:</span>
                        <span className="font-mono text-emerald-600 font-semibold">₹{receiptDetails.payment?.amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Method:</span>
                        <span>{receiptDetails.payment?.paymentMethod}</span>
                      </div>
                      {receiptDetails.payment?.referenceId && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Txn/Ref No:</span>
                          <span className="font-mono text-gray-700">{receiptDetails.payment?.referenceId}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>Recorded At:</span>
                        <span>{new Date(receiptDetails.payment?.paymentDate).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic p-3 bg-gray-50 border border-gray-150 rounded">
                      Payment recorded manually. Receipt details synced successfully.
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Footer Disclaimer */}
              <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-4 flex flex-col items-center">
                <span>Please settle outstanding dues before the specified due date to avoid overdue finance charges.</span>
                <span className="font-mono mt-1">Generated dynamically via NeighbourLink Ledger API</span>
              </div>
            </div>

            {/* Print action footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right no-print">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Manual Payment Modal */}
      {isPaymentModalOpen && paymentBill && (
        <div id="record-payment-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-800" />
                <span>Record Flat Payment</span>
              </h2>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Bill ID:</span>
                  <span className="font-mono font-bold text-gray-800">{paymentBill.billNumber}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Resident Name:</span>
                  <span className="font-semibold text-gray-800">{paymentBill.residentName}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Flat Location:</span>
                  <span>{paymentBill.buildingName} - {paymentBill.flatNumber}</span>
                </div>
                <div className="flex justify-between text-gray-500 border-t border-gray-200 pt-1.5 mt-1.5 font-bold">
                  <span>Outstanding Dues:</span>
                  <span className="font-mono text-red-600">₹{paymentBill.outstandingAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900"
                >
                  <option value="Cash">Cash (Direct Collection)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">Direct Bank IMPS/NEFT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Amount Collected (₹) *</label>
                <div className="relative flex items-center border border-gray-300 rounded-lg px-2.5 bg-white focus-within:border-slate-900">
                  <span className="text-gray-400 text-xs mr-1">₹</span>
                  <input
                    type="number"
                    value={payAmount || ""}
                    onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="e.g. 2500"
                    className="w-full text-xs p-2 bg-transparent focus:outline-none font-mono"
                    max={paymentBill.outstandingAmount}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Cheque / UPI Reference ID</label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. CHQ-283918 or UPI-Txn-3029"
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Internal Administrative Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Settle cash payment collected directly during office hours."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 rounded-lg shadow cursor-pointer transition"
                >
                  {isSubmittingPayment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Record Payment</span>
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
