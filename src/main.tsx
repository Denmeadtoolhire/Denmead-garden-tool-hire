import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/Home';
import ToolsPage from './pages/Tools';
import ToolDetailPage from './pages/ToolDetail';
import CartPage from './pages/Cart';
import CheckoutPage from './pages/Checkout';
import BookingConfirmationPage from './pages/BookingConfirmation';
import BookingRespondPage from './pages/BookingRespond';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import ManageTools from './pages/admin/ManageTools';
import ManageBookings from './pages/admin/ManageBookings';
import SettingsPage from './pages/admin/Settings';
import CustomersPage from './pages/admin/Customers';
import UnsubscribePage from './pages/admin/Unsubscribe';
import BlockedDates from './pages/admin/BlockedDates';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdmin();
  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <CartProvider>
          <Routes>
            <Route
              path="/"
              element={
                <PublicLayout>
                  <HomePage />
                </PublicLayout>
              }
            />
            <Route
              path="/tools"
              element={
                <PublicLayout>
                  <ToolsPage />
                </PublicLayout>
              }
            />
            <Route
              path="/tools/:id"
              element={
                <PublicLayout>
                  <ToolDetailPage />
                </PublicLayout>
              }
            />
            <Route
              path="/booking/cart"
              element={
                <PublicLayout>
                  <CartPage />
                </PublicLayout>
              }
            />
            <Route
              path="/booking/checkout"
              element={
                <PublicLayout>
                  <CheckoutPage />
                </PublicLayout>
              }
            />
            <Route
              path="/booking/confirmation"
              element={
                <PublicLayout>
                  <BookingConfirmationPage />
                </PublicLayout>
              }
            />
            <Route
              path="/booking/respond"
              element={
                <PublicLayout>
                  <BookingRespondPage />
                </PublicLayout>
              }
            />
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tools"
            element={
              <ProtectedRoute>
                <ManageTools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute>
                <ManageBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/blocked-dates"
            element={
              <ProtectedRoute>
                <BlockedDates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/unsubscribe"
            element={
              <PublicLayout>
                <UnsubscribePage />
              </PublicLayout>
            }
          />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
