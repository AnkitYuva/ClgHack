import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import BinMonitoring from "./pages/BinMonitoring";
import WasteClassification from "./pages/WasteClassification";
import RouteOptimization from "./pages/RouteOptimization";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/bins" element={<BinMonitoring />} />
      <Route path="/classify" element={<WasteClassification />} />
      <Route path="/routes" element={<RouteOptimization />} />
      <Route path="/reports" element={<Reports />} />
    </Routes>
  );
}
