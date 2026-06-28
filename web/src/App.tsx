import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import CheckInPage from "./pages/CheckInPage";
import CheckOutPage from "./pages/CheckOutPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProductsPage from "./pages/ProductsPage";
import ReorderPage from "./pages/ReorderPage";
import AdminPage from "./pages/AdminPage";

function ProtectedRoutes() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/check-out" element={<CheckOutPage />} />
        <Route path="/reorder" element={<ReorderPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}