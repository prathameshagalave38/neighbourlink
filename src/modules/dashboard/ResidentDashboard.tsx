import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { Home, Users, AlertCircle, CreditCard, Megaphone, Plus, LayoutGrid, CheckCircle } from "lucide-react";

export const ResidentDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div id="resident-dashboard-view" className="space-y-6">
      {/* Greeting Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resident Dashboard</h1>
          <p className="text-sm text-slate-300 mt-1">
            Hello, <span className="font-semibold">{user?.name || "Resident"}</span>. Welcome to your digital society control center.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-xs font-mono rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Flat Status: Connected</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">My Assigned Flat</span>
            <span className="text-base font-bold text-gray-900 font-mono">Not Assigned</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Active Visitors Today</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">0</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">My Open Tickets</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">0</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Outstanding Bill</span>
            <span className="text-xl font-bold text-red-600 font-mono">₹0.00</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="bg-white border border-gray-150 rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-slate-500" />
          <span>Quick Actions</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            id="qa-btn-raise-complaint"
            to="/resident/complaints"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Ticket</span>
          </Link>

          <Link
            id="qa-btn-add-visitor"
            to="/resident/visitors"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Visitor</span>
          </Link>

          <Link
            id="qa-btn-view-bills"
            to="/resident/bills"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <CreditCard className="w-4 h-4" />
            <span>View Bills</span>
          </Link>

          <Link
            id="qa-btn-view-notices"
            to="/notices"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Megaphone className="w-4 h-4" />
            <span>Notice Board</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Activity Pane */}
        <div className="lg:col-span-2 bg-white border border-gray-150 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">My Tickets & Queries</h3>
            <Link to="/resident/complaints" className="text-xs font-semibold text-slate-900 hover:underline">
              View History
            </Link>
          </div>
          <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            You haven't submitted any complaints yet.
          </div>
        </div>

        {/* Notice Board Side Widget */}
        <div className="bg-white border border-gray-150 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Latest Announcements</h3>
            <Link to="/notices" className="text-xs font-semibold text-slate-900 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800 font-mono block">Welcome Circular</span>
              <h4 className="text-sm font-bold text-gray-900 mt-1">NeighbourLink Live</h4>
              <p className="text-xs text-gray-600 mt-1">
                Your residential society dashboard is active. You can register visitors, submit maintenance requests and view bills dynamically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
