import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Toaster } from "react-hot-toast";

// Layout components
import { DashboardLayout } from "./components/layout/DashboardLayout.tsx";
import { PlaceholderPage } from "./components/common/PlaceholderPage.tsx";

// Auth modules
import { Login } from "./modules/auth/Login.tsx";
import { Register } from "./modules/auth/Register.tsx";

// Dashboard modules
import { AdminDashboard } from "./modules/dashboard/AdminDashboard.tsx";
import { ResidentDashboard } from "./modules/dashboard/ResidentDashboard.tsx";
import { SecurityDashboard } from "./modules/dashboard/SecurityDashboard.tsx";

// Admin Phase 3 modules
import { SocietySetup } from "./modules/admin/SocietySetup.tsx";
import { BuildingsSetup } from "./modules/admin/BuildingsSetup.tsx";
import { FlatsSetup } from "./modules/admin/FlatsSetup.tsx";

// Phase 4 modules
import { ResidentsSetup } from "./modules/admin/ResidentsSetup.tsx";
import { MyFlatInfo } from "./modules/resident/MyFlatInfo.tsx";

// Phase 5 modules
import { ComplaintsReview } from "./modules/admin/ComplaintsReview.tsx";
import { MyComplaints } from "./modules/resident/MyComplaints.tsx";

// Phase 6 modules
import { ParkingAllocations } from "./modules/admin/ParkingAllocations.tsx";
import { MyExpectedVisitors } from "./modules/resident/MyExpectedVisitors.tsx";
import { SecurityVisitorGateLogs } from "./modules/security/SecurityVisitorGateLogs.tsx";
import { GateVehicleVerification } from "./modules/security/GateVehicleVerification.tsx";

// Phase 7 modules
import { MaintenancePlans } from "./modules/admin/MaintenancePlans.tsx";
import { BillingGenerator } from "./modules/admin/BillingGenerator.tsx";
import { MyMaintenanceBills } from "./modules/resident/MyMaintenanceBills.tsx";

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div id="route-loader" className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-gray-500 font-sans">Connecting to NeighbourLink...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard if role not allowed
    if (user.role === "Admin" || user.role === "SuperAdmin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === "Resident") {
      return <Navigate to="/resident/dashboard" replace />;
    } else {
      return <Navigate to="/security/dashboard" replace />;
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Root route dispatcher matching user roles to their dashboard
const RootDispatcher: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "Admin" || user.role === "SuperAdmin") {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === "Resident") {
    return <Navigate to="/resident/dashboard" replace />;
  } else if (user.role === "Security") {
    return <Navigate to="/security/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global Notification Banners */}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Dispatcher */}
          <Route path="/" element={<RootDispatcher />} />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/society" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <SocietySetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/buildings" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <BuildingsSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/flats" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <FlatsSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/residents" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <ResidentsSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/complaints" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <ComplaintsReview />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/maintenance-plans" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <MaintenancePlans />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/billing" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <BillingGenerator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/parking" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <ParkingAllocations />
              </ProtectedRoute>
            } 
          />

          {/* Resident Protected Routes */}
          <Route 
            path="/resident/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <ResidentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/profile" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <MyFlatInfo />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/visitors" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <MyExpectedVisitors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/complaints" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <MyComplaints />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/bills" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <MyMaintenanceBills />
              </ProtectedRoute>
            } 
          />

          {/* Security Guard Protected Routes */}
          <Route 
            path="/security/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["Security"]}>
                <SecurityDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security/visitors" 
            element={
              <ProtectedRoute allowedRoles={["Security"]}>
                <SecurityVisitorGateLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security/parking" 
            element={
              <ProtectedRoute allowedRoles={["Security"]}>
                <GateVehicleVerification />
              </ProtectedRoute>
            } 
          />

          {/* Shared Protected Routes */}
          <Route 
            path="/notices" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Resident", "Security"]}>
                <PlaceholderPage title="Society Notice Board" phaseNeeded={8} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Resident", "Security"]}>
                <PlaceholderPage title="In-App Notification Alerts" phaseNeeded={8} />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
