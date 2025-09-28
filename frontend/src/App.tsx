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
import AdminPendingUsers from "./components/AdminPendingUsers";
import AdminInvite from "./components/AdminInvite";
import Achievements from "./components/Achievements";
import Notifications from "./components/Notifications";
import AdminAuditLogs from "./components/AdminAuditLogs";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <CssVarsProvider defaultMode="light">
      <AuthProvider>
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
                <Route path="/post/:id" element={<Detail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify-2fa" element={<TwoFactorVerify />} />
                <Route path="/register" element={<Register />} />
                <Route path="/confirm-email" element={<ConfirmEmail />} />
                <Route
                  path="/confirm-email-change"
                  element={<ConfirmEmailChange />}
                />
                <Route path="/confirm-disable-2fa" element={<ConfirmDisableTwoFactor />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/stations" element={<StationsList />} />
                <Route
                  path="/stations/new"
                  element={<StationForm mode="create" />}
                />
                <Route
                  path="/stations/:id/edit"
                  element={<StationForm mode="edit" />}
                />
                <Route path="/stations/global" element={<GlobalStations />} />
                <Route path="/station/:stationId" element={<StationPosts />} />
                <Route path="/users/global" element={<GlobalUsers />} />
                <Route path="/user/:id" element={<UserOverview />} />
                <Route path="/user/settings" element={<UserSettings />} />
                <Route path="/user/achievements" element={<Achievements />} />
                <Route path="/two-factor-verify" element={<TwoFactorVerify />} />
                <Route
                  path="/confirm-disable-2fa"
                  element={<ConfirmDisableTwoFactor />}
                />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/admin" element={<AdminOverview />} />
                <Route path="/admin/users" element={<AdminUserManagement />} />
                <Route path="/admin/pending-users" element={<AdminPendingUsers />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                <Route path="/admin/invite" element={<AdminInvite />} />
              </Routes>
            </Box>
            <Footer />
          </Box>
        </Router>
      </AuthProvider>
    </CssVarsProvider>
  );
}

export default App;
