import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const StripeCheckout = lazy(() => import("./components/StripeCheckout"));
const SendMoney = lazy(() => import("./pages/SendMoney"));
const Success = lazy(() => import("./pages/Success"));
const Profile = lazy(() => import("./pages/Profile"));
const BillPay = lazy(() => import("./pages/BillPay"));
const Beneficiaries = lazy(() => import("./pages/Beneficiaries"));
const Autopay = lazy(() => import("./pages/Autopay"));
const StorePay = lazy(() => import("./pages/StorePay"));
const SplitBill = lazy(() => import("./pages/SplitBill"));
const FixedDeposits = lazy(() => import("./pages/FixedDeposits"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Forex = lazy(() => import("./pages/Forex"));
const CardsPage = lazy(() => import("./pages/CardsPage"));
const KycVerification = lazy(() => import("./pages/KycVerification"));
const Loans = lazy(() => import("./pages/Loans"));
const Rewards = lazy(() => import("./pages/Rewards"));
const GoldVault = lazy(() => import("./pages/GoldVault"));
const PaymentLinks = lazy(() => import("./pages/PaymentLinks"));
const PublicPay = lazy(() => import("./pages/PublicPay"));
const TaxPlanner = lazy(() => import("./pages/TaxPlanner"));
const CreditCards = lazy(() => import("./pages/CreditCards"));
const TaxCertificates = lazy(() => import("./pages/TaxCertificates"));

/**
 * Intelligently routes the root URL:
 * - Authenticated users get their live Financial HQ Dashboard.
 * - Guest visitors get the NovaPay Showcase Landing Page with 1-click live demo access.
 */
function RootRoute() {
  const { isAuthenticated, token } = useAuth();

  if (token === undefined) {
    return <LoadingScreen message="Connecting to NovaPay..." />;
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public / Smart Root Route */}
          <Route path="/" element={<RootRoute />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Explicit Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <StripeCheckout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/success"
            element={
              <ProtectedRoute>
                <Success />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cancel"
            element={
              <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-3xl font-bold text-white">
                Payment Cancelled ❌
              </div>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/send-money"
            element={
              <ProtectedRoute>
                <SendMoney />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bills"
            element={
              <ProtectedRoute>
                <BillPay />
              </ProtectedRoute>
            }
          />

          <Route
            path="/beneficiaries"
            element={
              <ProtectedRoute>
                <Beneficiaries />
              </ProtectedRoute>
            }
          />

          <Route
            path="/autopay"
            element={
              <ProtectedRoute>
                <Autopay />
              </ProtectedRoute>
            }
          />

          <Route
            path="/store-pay"
            element={
              <ProtectedRoute>
                <StorePay />
              </ProtectedRoute>
            }
          />

          <Route
            path="/split-bills"
            element={
              <ProtectedRoute>
                <SplitBill />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fixed-deposits"
            element={
              <ProtectedRoute>
                <FixedDeposits />
              </ProtectedRoute>
            }
          />

          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <Budgets />
              </ProtectedRoute>
            }
          />

          <Route
            path="/forex"
            element={
              <ProtectedRoute>
                <Forex />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <CardsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KycVerification />
              </ProtectedRoute>
            }
          />

          <Route
            path="/loans"
            element={
              <ProtectedRoute>
                <Loans />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            }
          />

          <Route
            path="/gold"
            element={
              <ProtectedRoute>
                <GoldVault />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-links"
            element={
              <ProtectedRoute>
                <PaymentLinks />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tax"
            element={
              <ProtectedRoute>
                <TaxPlanner />
              </ProtectedRoute>
            }
          />

          <Route
            path="/credit-cards"
            element={
              <ProtectedRoute>
                <CreditCards />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tax-certificates"
            element={
              <ProtectedRoute>
                <TaxCertificates />
              </ProtectedRoute>
            }
          />

          {/* Public Hosted Payment Checkout (No login required) */}
          <Route path="/pay/:linkCode" element={<PublicPay />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;