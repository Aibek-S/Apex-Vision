import { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { BottomTabs } from "../components/navigation/BottomTabs";
import { SidebarNav } from "../components/navigation/SidebarNav";
import { navItems } from "../components/navigation/navItems";
import ArchaeologistChat from "../components/ArchaeologistChat";

export default function Dashboard() {
    const { user, isMuseumStaff, profileLoading } = useAuth();
    const location = useLocation();

    const displayName = useMemo(() => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name;
        }
        if (user?.email) {
            const [name] = user.email.split("@");
            return name;
        }
        return "Исследователь";
    }, [user]);

    const avatarInitials = useMemo(() => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name
                .split(" ")
                .map((word: string) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
        }

        if (user?.email) {
            const [name] = user.email.split("@");
            return name.slice(0, 2).toUpperCase();
        }

        return "ИИ";
    }, [user]);

    const allowedNavItems = isMuseumStaff
        ? navItems
        : navItems.filter((item) => item.id === "gallery");
    const mobileNav = allowedNavItems.filter((item) =>
        ["home", "gallery", "create", "profile"].includes(item.id)
    );

    const isGalleryRoute = location.pathname.startsWith("/dashboard/gallery");

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Обычным пользователям доступна только галерея.
    if (!isMuseumStaff && !isGalleryRoute) {
        return <Navigate to="/dashboard/gallery" replace />;
    }

    return (
        <div className="flex min-h-screen flex-col bg-white text-textDark lg:flex-row">
            <SidebarNav
                items={allowedNavItems}
                avatar={{
                    initials: avatarInitials,
                    name: displayName,
                    email: user?.email ?? undefined,
                }}
            />

            <main className="relative flex-1 bg-backgroundLight px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
                <div className="mx-auto w-full max-w-6xl">
                    <Outlet />
                </div>
            </main>

            <ArchaeologistChat />

            <div className="lg:hidden">
                <BottomTabs items={mobileNav} />
            </div>
        </div>
    );
}
