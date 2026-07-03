import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-yellow-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!user) {
    // Admin routes send unauthenticated visitors to the dedicated admin login;
    // everything else goes to the customer landing.
    const redirectTo = adminOnly ? "/admin/login" : "/";
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

