import type { ReactNode } from "react";
import {
    LayoutDashboard,
    Image,
    User,
    HelpCircle,
    PlusSquare,
} from "lucide-react";

export type NavItem = {
    id: string;
    label: string;
    to: string;
    icon: ReactNode;
    description?: string;
};

export const navItems: NavItem[] = [
    {
        id: "home",
        label: "Главная",
        to: "/dashboard/home",
        description: "Рабочее пространство",
        icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
        id: "gallery",
        label: "Галерея",
        to: "/dashboard/gallery",
        description: "Работы сообщества",
        icon: <Image className="w-5 h-5" />,
    },
    {
        id: "create",
        label: "Создать",
        to: "/dashboard/create",
        description: "Новый артефакт",
        icon: <PlusSquare className="w-5 h-5" />,
    },
    {
        id: "profile",
        label: "Профиль",
        to: "/dashboard/profile",
        description: "Данные пользователя",
        icon: <User className="w-5 h-5" />,
    },
    {
        id: "help",
        label: "Помощь",
        to: "/dashboard/help",
        description: "FAQ и поддержка",
        icon: <HelpCircle className="w-5 h-5" />,
    },
];
