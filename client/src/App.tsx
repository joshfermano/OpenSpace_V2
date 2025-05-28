import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { initPageLifecycleEvents } from './utils/pageLifecycle';

// Loading Fallback Component
import LoadingSpinner from './components/LoadingSpinner';

const ViewBooking = lazy(() => import('./pages/Bookings/viewBooking'));
const ViewAllBookings = lazy(() => import('./pages/Bookings/ViewAllBookings'));

// Password Reset
const ForgotPasswordPage = lazy(
  () => import('./pages/Auth/ForgotPasswordPage')
);
const ForgotPasswordSent = lazy(
  () => import('./pages/Auth/ForgotPasswordSent')
);

// Rooms
const ViewAllListings = lazy(() => import('./pages/Room/ViewAllListings'));
const ViewAllFavorites = lazy(() => import('./pages/Room/ViewAllFavorites'));
const ViewAllRoomReviews = lazy(
  () => import('./pages/Room/ViewAllRoomReviews')
);

// Dashboard Pages
const EarningsDashboard = lazy(
  () => import('./pages/Dashboard/EarningsDashboard')
);
const PlatformRevenueDashboard = lazy(
  () => import('./pages/Dashboard/PlatformRevenueDashboard')
);

// Platform Fee Remittance Pages
const PlatformFeeRemittance = lazy(
  () => import('./pages/Host/PlatformFeeRemittance')
);
const PlatformFeeRemittanceDashboard = lazy(
  () => import('./components/Admin/PlatformFeeRemittanceDashboard')
);

// UI Pages
const Homepage = lazy(() => import('./pages/Ui/Homepage'));
const About = lazy(() => import('./pages/Ui/About'));
const NotFound = lazy(() => import('./pages/Ui/NotFound'));

// Auth Pages
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const AdminLogin = lazy(() => import('./pages/Auth/AdminLogin'));
const AdminRegister = lazy(() => import('./pages/Auth/AdminRegister'));

// User Pages
const UserDashboard = lazy(() => import('./pages/User/UserDashboard'));
const HostBookings = lazy(() => import('./pages/Host/HostBookings'));
const EditUserProfile = lazy(() => import('./pages/User/EditUserProfile'));
const AdminDashboard = lazy(() => import('./pages/User/AdminDashboard'));
const BecomeHost = lazy(() => import('./pages/Host/BecomeHost'));

// Room Pages
const ViewRoom = lazy(() => import('./pages/Room/ViewRoom'));
const CreateRoom = lazy(() => import('./pages/Room/CreateRoom'));
const EditRoom = lazy(() => import('./pages/Room/EditRoom'));

// Payment Pages
const PaymentPage = lazy(() => import('./pages/Payment/PaymentPage'));
const PaymentConfirmation = lazy(
  () => import('./pages/Payment/PaymentConfirmation')
);

// Host Pages
const HostProfile = lazy(() => import('./pages/Host/HostProfile'));

// Verification Pages
const EmailVerification = lazy(
  () => import('./pages/Verification/EmailVerification')
);
const EmailSent = lazy(() => import('./pages/Verification/EmailSent'));
const PasswordResetVerification = lazy(
  () => import('./pages/Verification/PasswordResetVerification')
);

// Wrap component with suspense
const withSuspense = (Component: React.ComponentType): React.ReactNode => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Main Layout Routes */}
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={withSuspense(Homepage)} />
        <Route path="about" element={withSuspense(About)} />
        <Route path="rooms/:roomId" element={withSuspense(ViewRoom)} />
        <Route
          path="/rooms/:roomId/reviews"
          element={withSuspense(ViewAllRoomReviews)}
        />
        <Route path="hosts/:hostId" element={withSuspense(HostProfile)} />
        <Route path="become-host" element={withSuspense(BecomeHost)} />

        {/* Verification Routes */}
        <Route path="verification">
          <Route
            path="email-verification"
            element={
              <ProtectedRoute>{withSuspense(EmailVerification)}</ProtectedRoute>
            }
          />
          <Route
            path="email-sent"
            element={<ProtectedRoute>{withSuspense(EmailSent)}</ProtectedRoute>}
          />
          <Route
            path="password-reset"
            element={
              <ProtectedRoute>
                {withSuspense(PasswordResetVerification)}
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Protected Routes - User */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>{withSuspense(UserDashboard)}</ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/earnings"
          element={
            <ProtectedRoute requiredRole="host">
              {withSuspense(EarningsDashboard)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/platform-fees"
          element={
            <ProtectedRoute requiredRole="host">
              {withSuspense(PlatformFeeRemittance)}
            </ProtectedRoute>
          }
        />
        <Route
          path="profile/edit"
          element={
            <ProtectedRoute>{withSuspense(EditUserProfile)}</ProtectedRoute>
          }
        />

        {/* Protected Routes - Bookings */}
        <Route
          path="/bookings/view/:bookingId"
          element={<ProtectedRoute>{withSuspense(ViewBooking)}</ProtectedRoute>}
        />

        <Route
          path="/host/bookings"
          element={
            <ProtectedRoute requiredRole="host">
              {withSuspense(HostBookings)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings/all"
          element={
            <ProtectedRoute>{withSuspense(ViewAllBookings)}</ProtectedRoute>
          }
        />

        {/* Protected Routes - Listings & Favorites */}
        <Route
          path="/listings/all"
          element={
            <ProtectedRoute requiredRole="host">
              {withSuspense(ViewAllListings)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites/all"
          element={
            <ProtectedRoute>{withSuspense(ViewAllFavorites)}</ProtectedRoute>
          }
        />

        {/* Protected Routes - Payments */}
        <Route
          path="payment"
          element={<ProtectedRoute>{withSuspense(PaymentPage)}</ProtectedRoute>}
        />
        <Route
          path="payment/confirmation"
          element={
            <ProtectedRoute>{withSuspense(PaymentConfirmation)}</ProtectedRoute>
          }
        />

        {/* Protected Routes - Host */}
        <Route path="rooms">
          <Route
            path="create"
            element={
              <ProtectedRoute requiredRole="host">
                {withSuspense(CreateRoom)}
              </ProtectedRoute>
            }
          />
          <Route
            path="edit/:roomId"
            element={
              <ProtectedRoute requiredRole="host">
                {withSuspense(EditRoom)}
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Protected Routes - Admin */}
        <Route path="admin">
          <Route
            path="dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                {withSuspense(AdminDashboard)}
              </ProtectedRoute>
            }
          />
          <Route
            path="revenue"
            element={
              <ProtectedRoute requiredRole="admin">
                {withSuspense(PlatformRevenueDashboard)}
              </ProtectedRoute>
            }
          />
          <Route
            path="platform-fees"
            element={
              <ProtectedRoute requiredRole="admin">
                {withSuspense(PlatformFeeRemittanceDashboard)}
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 Page */}
        <Route path="*" element={withSuspense(NotFound)} />
      </Route>

      {/* Auth Layout Routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={withSuspense(Login)} />
        <Route path="register" element={withSuspense(Register)} />
        <Route path="admin-login" element={withSuspense(AdminLogin)} />
        <Route path="admin-register" element={withSuspense(AdminRegister)} />
        <Route
          path="forgot-password"
          element={withSuspense(ForgotPasswordPage)}
        />
      </Route>

      <Route
        path="/reset-password/:token"
        element={withSuspense(ForgotPasswordSent)}
      />
    </>
  )
);

const App = () => {
  // Initialize page lifecycle events to prevent unexpected refreshes
  useEffect(() => {
    const cleanup = initPageLifecycleEvents();
    return cleanup;
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
