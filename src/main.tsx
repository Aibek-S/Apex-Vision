import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/homepage.tsx";
import LoginPage from "./pages/auth/LoginPage.tsx";
import RegisterPage from "./pages/auth/RegisterPage.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/dashboard.tsx";
import DashMain from "./pages/dashboard/dash-main.tsx";
import DashProject from "./pages/dashboard/dash-project.tsx";
import DashCreate from "./pages/dashboard/dash-create.tsx";
import DashEdit from "./pages/dashboard/dash-edit.tsx";
import DashCapture from "./pages/dashboard/dash-capture.tsx";
import DashGallery from "./pages/dashboard/dash-gallery.tsx";
import DashProfile from "./pages/dashboard/dash-profile.tsx";
import DashHelp from "./pages/dashboard/dash-help.tsx";
import DashRequest from "./pages/dashboard/dash-request.tsx";
import DashInbox from "./pages/dashboard/dash-inbox.tsx";
import DashInboxDetail from "./pages/dashboard/dash-inbox-detail.tsx";

// Подключаем глобальные стили (включая директивы Tailwind)
import "./index.css";
import "./styles/tailwind.css";
import { Analytics } from "@vercel/analytics/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <AuthProvider>
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />

                {/* Protected Routes Example */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />}>
                        <Route index element={<Navigate to="home" replace />} />
                        <Route path="home" element={<DashMain />} />
                        <Route path="inbox" element={<DashInbox />} />
                        <Route path="inbox/:id" element={<DashInboxDetail />} />
                        <Route path="request" element={<DashRequest />} />
                        <Route path="create" element={<DashCreate />} />
                        <Route path="projects/:id" element={<DashProject />} />
                        <Route
                            path="projects/:id/edit"
                            element={<DashEdit />}
                        />
                        <Route
                            path="projects/:id/capture"
                            element={<DashCapture />}
                        />
                        {/* Dashboard Pages */}
                        <Route path="gallery" element={<DashGallery />} />
                        <Route path="profile" element={<DashProfile />} />
                        <Route path="help" element={<DashHelp />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
        <Analytics />
    </AuthProvider>,
);
