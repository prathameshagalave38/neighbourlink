import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { 
  Eye, 
  CreditCard, 
  X, 
  Loader2, 
  IndianRupee, 
  Calendar,
  CheckCircle2,
  Printer,
  Search,
  Check,
  QrCode,
  QrCode as QrIcon,
  Shield,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";

interface Charge {
  name: string;
  amount: number;
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

export const MyMaintenanceBills: React.FC = () => {
  const { token, user } = useAuth();
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Statement Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MaintenanceBill | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  // checkout Flow Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutBill, setCheckoutBill] = useState<MaintenanceBill | null>(null);
  const [paymentOption, setPaymentOption] = useState<"UPI" | "Card" | "NetBanking">("UPI");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [isPaying, setIsPaying] = useState(false);
  const [payStatusText, setPayStatusText] = useState("");

  const fetchMyBills = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/maintenance-bills", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBills(data.bills || []);
      } else {
        toast.error(data.error || "Failed to load maintenance bills.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to maintenance bill service.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyBills();
    }
  }, [token]);

  // View Statement details & fetch Receipt
  const handleOpenStatement = async (bill: MaintenanceBill) => {
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
        console.warn("Could not retrieve receipt.", e);
      } finally {
        setIsReceiptLoading(false);
      }
    }
  };

  // Trigger self-checkout Modal
  const handleOpenCheckout = (bill: MaintenanceBill) => {
    setCheckoutBill(bill);
    setPaymentOption("UPI");
    setUpiId(`${user?.email?.split("@")[0] || "resident"}@okaxis`);
    setCardNumber("");
    setCardHolder(user?.name || "");
    setCardExpiry("");
    setCardCvv("");
    setIsCheckoutOpen(true);
  };

  // Perform Simulated Payment sequence
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBill) return;

    // Simulate Payment Loading States
    setIsPaying(true);
    setPayStatusText("Initializing 3D Secure checkout tunnel...");

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await sleep(800);
    setPayStatusText("Connecting with bank payment provider gateway...");
    await sleep(800);
    setPayStatusText("Securing funds & authorization tokens...");
    await sleep(800);
    setPayStatusText("Processing final payment settlement...");
    await sleep(600);

    try {
      const res = await fetch(`/api/v1/society-management/maintenance-bills/${checkoutBill._id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: paymentOption,
          amount: checkoutBill.outstandingAmount,
          referenceId: `TXN-${paymentOption.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
          notes: "Settled online via self-checkout portal."
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Payment successful! Official receipt generated.");
        setIsCheckoutOpen(false);
        fetchMyBills();
        
        // Auto open the statement/receipt for feedback
        const updatedBill = { ...checkoutBill, status: "Paid", paidAmount: checkoutBill.totalAmount, outstandingAmount: 0 };
        handleOpenStatement(updatedBill);
      } else {
        toast.error(data.error || "Payment processing failed. Please contact society desk.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete transaction due to network issues.");
    } finally {
      setIsPaying(false);
      setPayStatusText("");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="resident-bills-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-gray-150 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-700" />
            <span>My Maintenance Bills & Receipts</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Access your society maintenance statements, settle outstanding balances, and print receipts online.
          </p>
        </div>
      </div>

      {/* Main Grid/List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-xl">
          <Loader2 className="w-8 h-8 text-slate-950 animate-spin" />
          <span className="text-xs text-gray-500 mt-2 font-mono">Loading active billing ledger...</span>
        </div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-gray-250 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No Bills Generated</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            There are no maintenance statements generated for your mapped flat. Please contact the society administration desk if this is in error.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills.map((bill) => (
            <div 
              key={bill._id} 
              id={`bill-card-${bill._id}`}
              className="bg-white border border-gray-150 rounded-xl shadow-sm hover:border-gray-300 transition overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider font-mono ${
                    bill.status === "Paid" 
                      ? "bg-emerald-50 text-emerald-700" 
                      : bill.status === "Partially Paid"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {bill.status}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 font-mono">
                    {bill.billingMonth}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mt-2.5 flex items-center gap-1">
                  <span>Invoice:</span>
                  <span className="font-mono text-gray-600 font-normal">{bill.billNumber}</span>
                </h3>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Location</span>
                    <span className="text-gray-700 font-medium">Flat {bill.flatNumber}</span>
                    <span className="text-gray-400 block text-[11px]">{bill.buildingName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Payment Due Date</span>
                    <span className="text-rose-600 font-medium">{bill.dueDate}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-100 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Statement Total</span>
                    <span className="font-mono font-bold text-gray-900">₹{bill.totalAmount.toFixed(2)}</span>
                  </div>
                  {bill.outstandingAmount > 0 ? (
                    <div className="text-right">
                      <span className="text-red-500 block text-[10px] uppercase font-bold">Outstanding Dues</span>
                      <span className="font-mono font-bold text-red-600">₹{bill.outstandingAmount.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="text-right flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono">
                      <Check className="w-3.5 h-3.5" />
                      <span>Settle Completed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <button
                  id={`btn-view-statement-${bill._id}`}
                  onClick={() => handleOpenStatement(bill)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Statement & Receipt</span>
                </button>

                {bill.status !== "Paid" && (
                  <button
                    id={`btn-pay-now-${bill._id}`}
                    onClick={() => handleOpenCheckout(bill)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Online</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill Statement Detail Modal (Shared style) */}
      {isDetailModalOpen && selectedBill && (
        <div id="bill-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 no-print">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Maintenance Statement</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Details</span>
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Statement Content */}
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

              {/* Payments History ledger receipt details */}
              {selectedBill.paidAmount > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payments History Ledger</h3>
                  {isReceiptLoading ? (
                    <div className="flex justify-center p-3">
                      <Loader2 className="w-5 h-5 text-slate-800 animate-spin" />
                    </div>
                  ) : receiptDetails && receiptDetails.payment ? (
                    <div className="border border-gray-150 rounded-lg p-4 text-xs bg-gray-50/50 space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-gray-200">
                        <span>Official Receipt Reference</span>
                        <span className="font-mono text-emerald-700">{receiptDetails.receipt?.receiptNumber || "N/A"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Paid Dues</span>
                          <span className="font-mono text-emerald-600 font-semibold text-sm">₹{receiptDetails.payment?.amount?.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Settlement Method</span>
                          <span className="font-semibold text-gray-800">{receiptDetails.payment?.paymentMethod}</span>
                        </div>
                        {receiptDetails.payment?.referenceId && (
                          <div className="col-span-2">
                            <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Transaction Reference ID</span>
                            <span className="font-mono text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5">{receiptDetails.payment?.referenceId}</span>
                          </div>
                        )}
                        <div className="col-span-2 text-gray-400 text-[10px] mt-1 italic">
                          Acknowledged dynamically. Settled on {new Date(receiptDetails.payment?.paymentDate).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic p-3 bg-gray-50 border border-gray-150 rounded">
                      Payment recorded successfully. Statement updated in real-time.
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-4 flex flex-col items-center">
                <span>Thank you for keeping your society maintenance dues settled.</span>
                <span className="font-mono mt-1">NeighbourLink Online Receipt Authorization Engine</span>
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

      {/* Online Self-Checkout Gate Dialog */}
      {isCheckoutOpen && checkoutBill && (
        <div id="checkout-gateway-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col">
            {/* Header / Secure badge */}
            <div className="p-5 border-b border-gray-150 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-xs font-bold tracking-wider uppercase">Secure Gateway</h2>
                  <p className="text-[10px] text-gray-400">NeighbourLink Instant Checkout</p>
                </div>
              </div>
              <button 
                onClick={() => !isPaying && setIsCheckoutOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-md transition cursor-pointer"
                disabled={isPaying}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment loading indicator state */}
            {isPaying ? (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Processing Secure Transaction</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1.5 px-6 animate-pulse">{payStatusText}</p>
                </div>
                <div className="text-[10px] text-gray-400 bg-gray-50 border border-gray-150 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>AES-256 Bit Payment Tunnel</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePaySubmit} className="p-5 space-y-5">
                {/* Due summary bar */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider">Statement Balance</span>
                    <span className="font-semibold text-gray-800">{checkoutBill.billingMonth} ({checkoutBill.billNumber})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider">Net Payable</span>
                    <span className="font-mono text-base font-bold text-slate-900">₹{checkoutBill.outstandingAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Secure checkout Tab selections */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Checkout Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("UPI")}
                      className={`py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                        paymentOption === "UPI"
                          ? "border-slate-900 bg-slate-50 text-slate-900 shadow-xs"
                          : "border-gray-200 text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Instant UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("Card")}
                      className={`py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                        paymentOption === "Card"
                          ? "border-slate-900 bg-slate-50 text-slate-900 shadow-xs"
                          : "border-gray-200 text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Debit/Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("NetBanking")}
                      className={`py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                        paymentOption === "NetBanking"
                          ? "border-slate-900 bg-slate-50 text-slate-900 shadow-xs"
                          : "border-gray-200 text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Net Banking
                    </button>
                  </div>
                </div>

                {/* Selected payment options configuration UI */}
                {paymentOption === "UPI" && (
                  <div className="space-y-3.5 pt-2">
                    <div className="flex gap-4 items-center bg-slate-50 p-3 border border-gray-150 rounded-xl">
                      <div className="p-2 bg-white border border-gray-200 rounded-lg flex-shrink-0">
                        {/* Custom mockup QR Code placeholder */}
                        <QrCode className="w-10 h-10 text-slate-800" />
                      </div>
                      <div className="text-xs">
                        <strong className="text-gray-800 block">Scan mockup QR code</strong>
                        <span className="text-[11px] text-gray-500">Scan via BHIM, GooglePay, PhonePe, or PayTM apps to settle instantly.</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 block">Or enter UPI Virtual Payment Address (VPA)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="username@bank"
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                        required={paymentOption === "UPI"}
                      />
                    </div>
                  </div>
                )}

                {paymentOption === "Card" && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 block">Cardholder Full Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900"
                        required={paymentOption === "Card"}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 block">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                        maxLength={19}
                        placeholder="4111 2222 3333 4444"
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                        required={paymentOption === "Card"}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 block">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                          required={paymentOption === "Card"}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 block">CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          maxLength={3}
                          className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                          required={paymentOption === "Card"}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentOption === "NetBanking" && (
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-gray-500 block">Select Popular Retail Bank</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Bank", "IndusInd Bank"].map(bank => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={`p-2.5 text-xs text-left border rounded-lg transition ${
                            selectedBank === bank 
                              ? "border-slate-900 bg-slate-50 font-semibold text-slate-900" 
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gateway authorization CTA */}
                <div className="pt-4 border-t border-gray-150 flex justify-end gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancel Checkout
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 text-xs font-bold text-center text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow cursor-pointer transition"
                  >
                    Authorize Payment (₹{checkoutBill.outstandingAmount.toFixed(2)})
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
