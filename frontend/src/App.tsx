import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssVarsProvider } from "@mui/joy/styles";
import { Box } from "@mui/joy";
import Navbar from "./components/Navbar";
import Overview from "./components/Overview";
import Detail from "./components/Detail";
import Login from "./components/Login";
import Register from "./components/Register";
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
                <Route path="/register" element={<Register />} />
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
