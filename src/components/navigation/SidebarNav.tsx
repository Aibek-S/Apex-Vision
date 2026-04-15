import { NavLink, useNavigate } from "react-router-dom";
import type { NavItem } from "./navItems";
import { Button } from "../UI/button";

type SidebarNavProps = {
    items: NavItem[];
    avatar: {
        initials: string;
        name: string;
        email?: string;
    };
    showGuestActions?: boolean;
};

export function SidebarNav({ items, avatar, showGuestActions }: SidebarNavProps) {
    const navigate = useNavigate();

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

            {showGuestActions && (
                <div className="rounded-2xl border border-secondary/15 bg-backgroundLight/70 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-textDark">
                        Вы вошли как гость
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                        Зарегистрируйтесь или войдите, чтобы сохранять проекты
                        и работать с полным функционалом.
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => navigate("/auth/register")}
                        >
                            Регистрация
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/auth/login")}
                        >
                            Войти
                        </Button>
                    </div>
                </div>
            )}
        </aside>
    );
}
