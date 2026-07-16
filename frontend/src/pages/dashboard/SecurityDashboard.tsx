import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { ShieldAlert, UserCheck, ShieldCheck, Car, Plus, LayoutGrid, AlertCircle } from "lucide-react";

export const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div id="security-dashboard-view" className="space-y-6">
      {/* Greeting Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Main Gate Security Terminal</h1>
          <p className="text-sm text-slate-300 mt-1">
            Logged In Guard: <span className="font-semibold">{user?.name || "Security Officer"}</span>. Verify visitor approvals and record entry/exit logs.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-xs font-mono rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Gate Scanner Status: Active</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Today's Visitors</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">0</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Waiting Approval</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">0</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Currently Inside</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">0</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Registered Vehicles</span>
            <span className="text-2xl font-bold text-gray-900 font-mono">0</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="bg-white border border-gray-150 rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-slate-500" />
          <span>Security Controls</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            id="qa-btn-log-visitor"
            to="/security/visitors"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Plus className="w-4 h-4" />
            <span>Record Walk-in Arrival</span>
          </Link>

          <Link
            id="qa-btn-checkout-visitor"
            to="/security/visitors"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Record Visitor Departure (Check-out)</span>
          </Link>

          <Link
            id="qa-btn-verify-vehicle"
            to="/security/parking"
            className="flex items-center gap-2 justify-center p-3 text-sm font-semibold border border-gray-200 hover:border-slate-900 rounded-lg text-gray-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer text-center"
          >
            <Car className="w-4 h-4" />
            <span>Verify Registered Vehicle</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Visitor Logs Frame */}
        <div className="bg-white border border-gray-150 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Today's Entry & Departure Logs</h3>
            <Link to="/security/visitors" className="text-xs font-semibold text-slate-900 hover:underline">
              View History Log
            </Link>
          </div>
          <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            No entries or departures logged today yet.
          </div>
        </div>
      </div>
    </div>
  );
};
