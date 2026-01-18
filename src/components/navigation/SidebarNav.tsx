import { NavLink } from "react-router-dom";
import type { NavItem } from "./navItems";

type SidebarNavProps = {
    items: NavItem[];
    avatar: {
        initials: string;
        name: string;
        email?: string;
    };
};

export function SidebarNav({ items, avatar }: SidebarNavProps) {
    return (
        <aside className="hidden h-screen min-w-[260px] max-w-[300px] flex-col gap-10 border-r border-black/5 bg-white px-6 py-8 lg:flex">
            <div className="flex items-center gap-4 px-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primaryDark text-xl font-black text-white shadow-lg shadow-primary/20">
                    {avatar.initials}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                    <p className="truncate text-md font-bold text-textDark">
                        {avatar.name}
                    </p>
                    <p
                        className="truncate text-[10px] font-black uppercase tracking-wider text-secondary/60"
                        title={avatar.email ?? ""}
                    >
                        {avatar.email ?? ""}
                    </p>
                </div>
            </div>

            <nav className="flex-1 space-y-3">
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40">
                    Меню
                </p>
                {items.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-300 ${
                                isActive
                                    ? "scale-[1.02] border border-primary/10 bg-backgroundLight text-primary shadow-sm"
                                    : "text-secondary hover:translate-x-1 hover:bg-backgroundLight/60"
                            }`
                        }
                    >
                        <span className="text-secondary/60">{item.icon}</span>
                        <span className="flex-1">
                            <p className="text-sm font-bold text-textDark">
                                {item.label}
                            </p>
                            {item.description && (
                                <span className="text-[11px] text-secondary/70">
                                    {item.description}
                                </span>
                            )}
                        </span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
