import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { LogOut, Bell, Building2, User } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav id="app-navbar" className="fixed top-0 z-30 flex items-center justify-between w-full h-16 px-6 border-b border-gray-200 bg-white">
      {/* Branding & Logo */}
      <Link id="nav-brand" to="/" className="flex items-center gap-2">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 text-white">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-gray-900">NeighbourLink</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider leading-none">V1.0 MVP</span>
        </div>
      </Link>

      {/* Action Controls */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Notifications Trigger */}
            <Link 
              id="navbar-notifications-trigger" 
              to="/notifications" 
              className="relative p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-full transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </Link>

            {/* Profile Brief Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-150 rounded-full">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-700 font-sans">{user.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            </div>

            {/* Logout Control Trigger */}
            <button
              id="navbar-logout-btn"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
              title="Logout from session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <Link
            id="navbar-login-btn"
            to="/login"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};
