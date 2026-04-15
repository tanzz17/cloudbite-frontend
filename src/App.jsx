import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import { AddressProvider } from './context/AddressContext'
import { ProtectedRoute } from './components/common/index'
import { DashboardLayout } from './components/common/DashboardLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOwners from './pages/admin/AdminOwners'
import AdminPartners from './pages/admin/AdminPartners'
import AdminKitchens, { AdminOrders } from './pages/admin/AdminKitchens'
import ProfilePage from './pages/ProfilePage'

// Kitchen Owner
import KitchenDashboard from './pages/kitchen/KitchenDashboard'
import KitchenOrders from './pages/kitchen/KitchenOrders'
import KitchenMenu from './pages/kitchen/KitchenMenu'
import KitchenProfilePage from './pages/kitchen/KitchenProfile'

// Customer
import CustomerHome from './pages/customer/CustomerHome'
import KitchenMenuPage from './pages/customer/KitchenMenuPage'
import CartPage from './pages/customer/CartPage'
import { CustomerOrders, OrderDetail } from './pages/customer/CustomerOrders'
import OrderTrackingPage from './pages/customer/OrderTrackingPage'

import BrowseByDish from './pages/customer/BrowseByDish'
import CustomerLayout from './components/common/CustomerLayout'

// Delivery
import DeliveryDashboard from './pages/delivery/DeliveryDashboard'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AddressProvider>
            <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '16px',
                  fontFamily: 'Lato, sans-serif',
                  fontSize: '14px',
                  padding: '12px 16px',
                  border: '1px solid #fed7aa',
                },
                success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
              }}
            />

            <Routes>
              {/* Public */}
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/"         element={<LandingPage />} />

              {/* ======== ADMIN DASHBOARD ======== */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="owners"   element={<AdminOwners />} />
                <Route path="partners" element={<AdminPartners />} />
                <Route path="kitchens" element={<AdminKitchens />} />
                <Route path="orders"   element={<AdminOrders />} />
                <Route path="profile"  element={<ProfilePage />} />
              </Route>

              {/* ======== KITCHEN OWNER DASHBOARD ======== */}
              <Route path="/kitchen" element={
                <ProtectedRoute allowedRoles={['KITCHEN_OWNER']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index   element={<KitchenDashboard />} />
                <Route path="menu"    element={<KitchenMenu />} />
                <Route path="orders"  element={<KitchenOrders />} />
                <Route path="profile" element={<KitchenProfilePage />} />
                <Route path="account" element={<ProfilePage />} />
              </Route>

              {/* ======== CUSTOMER — wrapped in CustomerLayout for global navbar ======== */}
              <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerLayout /></ProtectedRoute>}>
                <Route path="/home"                    element={<CustomerHome />} />
                <Route path="/kitchen-menu/:kitchenId" element={<KitchenMenuPage />} />
                <Route path="/browse"                  element={<BrowseByDish />} />
                <Route path="/cart"                    element={<CartPage />} />
                <Route path="/orders"                  element={<CustomerOrders />} />
                <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
                <Route path="/profile"                 element={<ProfilePage />} />
              </Route>

              {/* ======== DELIVERY PARTNER DASHBOARD ======== */}
              <Route path="/delivery" element={
                <ProtectedRoute allowedRoles={['DELIVERY_PARTNER']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index    element={<DeliveryDashboard />} />
                <Route path="orders"  element={<DeliveryDashboard />} />
                <Route path="history" element={<DeliveryDashboard />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          </AddressProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
