import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssVarsProvider } from "@mui/joy/styles";
import { Box } from "@mui/joy";
import Navbar from "./components/Navbar";
import Overview from "./components/Overview";
import Detail from "./components/Detail";
import Login from "./components/Login";
import Register from "./components/Register";
import ConfirmEmail from "./components/ConfirmEmail";
import ConfirmEmailChange from "./components/ConfirmEmailChange";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import StationsList from "./components/StationsList";
import StationForm from "./components/StationForm";
import GlobalStations from "./components/GlobalStations";
import StationPosts from "./components/StationPosts";
import UserOverview from "./components/UserOverview";
import UserSettings from "./components/UserSettings";
import GlobalUsers from "./components/GlobalUsers";
import BackendStatus from "./components/BackendStatus";
import Footer from "./components/Footer";
import TwoFactorVerify from "./components/TwoFactorVerify";
import ConfirmDisableTwoFactor from "./components/ConfirmDisableTwoFactor";
import AdminOverview from "./components/AdminOverview";
import AdminUserManagement from "./components/AdminUserManagement";
import AdminUserDetail from "./components/AdminUserDetail";
import AdminPosts from "./components/AdminPosts";
import AdminPostDetail from "./components/AdminPostDetail";
import Achievements from "./components/Achievements";
import Notifications from "./components/Notifications";
import AdminAuditLogs from "./components/AdminAuditLogs";
import AdminReports from "./components/AdminReports";
import AdminStationsMap from "./components/AdminStationsMap";
import AdminDebug from "./components/AdminDebug";
import ProtectedRoute from "./components/ProtectedRoute";
import { isDebugMode } from "./utils/debug";
import { AuthProvider } from "./contexts/AuthContext";
import { TranslationProvider } from "./contexts/TranslationContext";

function App() {
  return (
    <CssVarsProvider defaultMode="light">
      <AuthProvider>
        <TranslationProvider>
          <Router>
            <Box
              sx={{
                minHeight: "100vh",
                width: "100vw",
                bgcolor: "background.body",
                margin: 0,
                padding: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Navbar />
              <BackendStatus />
              <Box sx={{ px: { xs: 2, md: 4 }, flex: 1 }}>
                <Routes>
                  <Route path="/" element={<Overview />} />
                  <Route
                    path="/post/:id"
                    element={
                      <ProtectedRoute>
                        <Detail />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/login" element={<Login />} />
                  <Route path="/verify-2fa" element={<TwoFactorVerify />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/confirm-email" element={<ConfirmEmail />} />
                  <Route
                    path="/confirm-email-change"
                    element={<ConfirmEmailChange />}
                  />
                  <Route
                    path="/confirm-disable-2fa"
                    element={<ConfirmDisableTwoFactor />}
                  />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/stations"
                    element={
                      <ProtectedRoute>
                        <StationsList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/stations/new"
                    element={
                      <ProtectedRoute>
                        <StationForm mode="create" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/stations/:id/edit"
                    element={
                      <ProtectedRoute>
                        <StationForm mode="edit" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/stations/global"
                    element={
                      <ProtectedRoute>
                        <GlobalStations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/station/:stationId"
                    element={
                      <ProtectedRoute>
                        <StationPosts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users/global"
                    element={
                      <ProtectedRoute>
                        <GlobalUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user/:id"
                    element={
                      <ProtectedRoute>
                        <UserOverview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user/settings"
                    element={
                      <ProtectedRoute>
                        <UserSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user/achievements"
                    element={
                      <ProtectedRoute>
                        <Achievements />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/two-factor-verify"
                    element={<TwoFactorVerify />}
                  />
                  <Route
                    path="/confirm-disable-2fa"
                    element={<ConfirmDisableTwoFactor />}
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminOverview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute>
                        <AdminUserManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users/:id"
                    element={
                      <ProtectedRoute>
                        <AdminUserDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/posts"
                    element={
                      <ProtectedRoute>
                        <AdminPosts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/posts/:id"
                    element={
                      <ProtectedRoute>
                        <AdminPostDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <ProtectedRoute>
                        <AdminReports />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/stations"
                    element={
                      <ProtectedRoute>
                        <AdminStationsMap />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit-logs"
                    element={
                      <ProtectedRoute>
                        <AdminAuditLogs />
                      </ProtectedRoute>
                    }
                  />
                  {isDebugMode() && (
                    <Route
                      path="/admin/debug"
                      element={
                        <ProtectedRoute>
                          <AdminDebug />
                        </ProtectedRoute>
                      }
                    />
                  )}
                </Routes>
              </Box>
              <Footer />
            </Box>
          </Router>
        </TranslationProvider>
      </AuthProvider>
    </CssVarsProvider>
  );
}

export default App;
