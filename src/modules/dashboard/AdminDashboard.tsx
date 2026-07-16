import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { Building2, Users, AlertCircle, CreditCard, Megaphone, Plus, LayoutGrid, CheckCircle } from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = React.useState({
    buildings: 0,
    residents: 0,
    complaints: 0,
    outstandingBills: 0,
    unpaidAmount: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const headers = { "Authorization": `Bearer ${token}` };
        
        // Fetch buildings
        const bRes = await fetch("/api/v1/society-management/buildings", { headers });
        const bData = await bRes.json();
        
        // Fetch residents
        const rRes = await fetch("/api/v1/society-management/residents", { headers });
        const rData = await rRes.json();
        
        // Fetch complaints
        const cRes = await fetch("/api/v1/society-management/complaints", { headers });
        const cData = await cRes.json();
        
        // Fetch maintenance bills
        const mRes = await fetch("/api/v1/society-management/maintenance-bills", { headers });
        const mData = await mRes.json();

        const unpaid = (mData.bills || []).filter((b: any) => b.status !== "Paid");
        const unpaidSum = unpaid.reduce((sum: number, b: any) => sum + (b.outstandingAmount || 0), 0);

        setStats({
          buildings: bData.buildings?.length || 0,
          residents: rData.residents?.length || 0,
          complaints: (cData.complaints || []).filter((c: any) => c.status !== "Resolved").length,
          outstandingBills: unpaid.length,
          unpaidAmount: unpaidSum
        });
      } catch (err) {
        console.warn("Could not sync complete dashboard counters:", err);
      }
    };
    if (token) {
      fetchStats();
    }
  }, [token]);

  return (
    <div id="admin-dashboard-view" className="space-y-6">
      {/* Greeting Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Society Administration Portal</h1>
          <p className="text-sm text-slate-300 mt-1">
            Welcome back, <span className="font-semibold">{user?.name || "Administrator"}</span>. Manage your society structure, buildings, flats, and residents below.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-xs font-mono rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Status: Fully Operational</span>
        </div>
      </div>

      {/* Main High-Level Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Buildings</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">{stats.buildings}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Residents</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">{stats.residents}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Pending Tickets</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">{stats.complaints}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Pending Billing</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">{stats.outstandingBills}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="bg-white border border-gray-150 rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-slate-500" />
          <span>Quick Administrative Actions</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            id="qa-btn-add-building"
            to="/admin/buildings"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Plus className="w-4 h-4" />
            <span>Setup Building</span>
          </Link>

          <Link
            id="qa-btn-add-flat"
            to="/admin/flats"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Plus className="w-4 h-4" />
            <span>Configure Flat</span>
          </Link>

          <Link
            id="qa-btn-add-resident"
            to="/admin/residents"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Plus className="w-4 h-4" />
            <span>Map Resident</span>
          </Link>

          <Link
            id="qa-btn-publish-notice"
            to="/notices"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Megaphone className="w-4 h-4" />
            <span>Publish Notice</span>
          </Link>
        </div>
      </div>

      {/* Grid Layout representing status of buildings and recent tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Activity Pane */}
        <div className="lg:col-span-2 bg-white border border-gray-150 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Recent Complaints & Tickets</h3>
            <Link to="/admin/complaints" className="text-xs font-semibold text-slate-900 hover:underline">
              View All
            </Link>
          </div>
          <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            No complaints registered. The list is empty.
          </div>
        </div>

        {/* Notice Board Side Widget */}
        <div className="bg-white border border-gray-150 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Latest Circulars</h3>
            <Link to="/notices" className="text-xs font-semibold text-slate-900 hover:underline">
              Board
            </Link>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800 font-mono block">System Setup Circular</span>
              <h4 className="text-sm font-bold text-gray-900 mt-1">NeighbourLink Launch</h4>
              <p className="text-xs text-gray-600 mt-1">
                Welcome to Phase 1 setup. Complete the configuration of buildings and residents inside this sandbox.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
