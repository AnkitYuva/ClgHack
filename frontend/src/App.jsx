import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import BinMonitoring from "./pages/BinMonitoring";
import WasteClassification from "./pages/WasteClassification";
import RouteOptimization from "./pages/RouteOptimization";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";

// Role-based Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("ecosmart_user"));
  } catch (e) {
    user = null;
  }
  const token = localStorage.getItem("ecosmart_token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* User Only Routes */}
      <Route path="/user-dashboard" element={<ProtectedRoute allowedRoles={["user"]}><UserDashboard /></ProtectedRoute>} />

      {/* Admin Only Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
      <Route path="/bins" element={<ProtectedRoute allowedRoles={["admin"]}><BinMonitoring /></ProtectedRoute>} />
      <Route path="/classify" element={<ProtectedRoute allowedRoles={["admin"]}><WasteClassification /></ProtectedRoute>} />
      <Route path="/routes" element={<ProtectedRoute allowedRoles={["admin"]}><RouteOptimization /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin"]}><Reports /></ProtectedRoute>} />
    </Routes>
  );
}
