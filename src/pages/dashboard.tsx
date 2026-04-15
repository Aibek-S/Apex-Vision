import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { BottomTabs } from "../components/navigation/BottomTabs";
import { SidebarNav } from "../components/navigation/SidebarNav";
import { navItems } from "../components/navigation/navItems";
import ArchaeologistChat from "../components/ArchaeologistChat";

export default function Dashboard() {
    const { user, isMuseumStaff, isGuest, profileLoading } = useAuth();

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

    const allowedNavItems = navItems.filter((item) => {
        if (isGuest) return item.id === "gallery";
        if (isMuseumStaff) return item.id !== "request";
        return item.id !== "create" && item.id !== "inbox";
    });
    const mobileNavIds = isGuest
        ? ["gallery"]
        : isMuseumStaff
          ? ["home", "create", "profile"]
          : ["home", "request", "gallery", "profile"];
    const mobileNav = allowedNavItems.filter((item) =>
        mobileNavIds.includes(item.id),
    );

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Обычным пользователям недоступно только создание.

    return (
        <div className="flex min-h-screen flex-col bg-white text-textDark lg:flex-row">
            <SidebarNav
                items={allowedNavItems}
                showGuestActions={isGuest}
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
