import { NavLink, useLocation } from "react-router-dom";
import type { NavItem } from "./navItems";

type BottomTabsProps = {
    items: NavItem[];
};

export function BottomTabs({ items }: BottomTabsProps) {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/10 bg-white/90 backdrop-blur-lg shadow-[0_-8px_24px_rgba(0,0,0,0.04)] px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
                {items.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                        <NavLink
                            key={item.id}
                            to={item.to}
                            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition-all ${
                                isActive
                                    ? "text-primary bg-primary/5"
                                    : "text-secondary/70 hover:text-textDark"
                            }`}
                        >
                            <span
                                className={`flex h-6 w-6 items-center justify-center ${
                                    isActive
                                        ? "text-primary"
                                        : "text-secondary/60"
                                }`}
                            >
                                {item.icon}
                            </span>
                            <span className="leading-tight">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
