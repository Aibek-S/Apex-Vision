import { useState } from "react";
import { Button } from "../UI/button.tsx";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { LogOut, User } from "lucide-react";

export default function Header() {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const navLinks = [
        { name: "Главная", path: "/" },
        { name: "О проекте", path: "/#about" },
        { name: "Галерея", path: "/#gallery" },
        { name: "Поддержка", path: "/#support" }
    ];

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <header className="bg-background shadow-inner">
            <div className="max-w-7xl mx-auto px-6 py-0.5 flex items-center justify-between">
                {/* Логотип */}
                <Link to="/" className="flex items-center gap-4">
                    <img
                        src="/public/assets/pngs/favicon.ico"
                        alt="Logo"
                        className="h-14 w-14 rounded-xl"
                    />
                    <span className="font-logo font-medium text-primary drop-shadow-lg text-lg sm:text-xl md:text-3xl">
                        Apex-Vision
                    </span>
                </Link>

                {/* Навигация desktop */}
                <nav className="hidden md:flex gap-7 justify-right font-heading">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className="text-textDark font-heading font-medium hover:text-primary transition-colors duration-200 ease-out relative pb-1 before:content-[''] before:absolute before:bottom-0 before:left-0 before:bg-primary before:transition-all before:duration-300 before:ease-out before:w-0 hover:before:w-full before:h-0.5"
                        >
                            {link.name}
                        </Link>
                    ))}
                    </nav>
                    <nav className="hidden md:flex gap-7 items-center font-heading">

                    {/* CTA / User Profile */}
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-textDark">
                                <User className="w-5 h-5 text-primary" />
                                <span className="font-medium text-sm hidden lg:inline">
                                    {user.user_metadata.full_name || user.email}
                                </span>
                            </div>
                            <Button size="sm" variant="outline" onClick={handleSignOut} iconRight={<LogOut className="w-4 h-4" />}>
                                Выйти
                            </Button>
                        </div>
                    ) : (
                        <>
                        <Button size="md" gap={0} variant="primary" onClick={() => navigate('/auth/register')}>
                            Регистрация
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate('/auth/login')}>
                            Войти
                        </Button></>
                    )}
                </nav>

                {/* Бургер меню mobile */}
                <div className="md:hidden">
                    <button
                        onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
                        className="relative flex flex-col gap-1 w-6 h-6 justify-center"
                    >
                        <div className="flex flex-col justify-between w-6 h-4 absolute">
                            <span
                                className={`block h-[3px] bg-textDark rounded-full transition-all duration-300 ${
                                    isMobileMenuOpen
                                        ? "rotate-45 translate-y-1.5"
                                        : "opacity-100"
                                }`}
                            />
                            <span
                                className={`block h-[3px] bg-textDark rounded-full transition-all duration-300 ${
                                    isMobileMenuOpen
                                        ? "opacity-0 w-0"
                                        : "opacity-100 w-full"
                                }`}
                            />
                            <span
                                className={`block h-[3px] bg-textDark rounded-full transition-all duration-300 ${
                                    isMobileMenuOpen
                                        ? "-rotate-45 -translate-y-1.5"
                                        : "opacity-100"
                                }`}
                            />
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <div
                className={`md:hidden bg-background shadow-inner py-4 px-6 flex flex-col gap-4 overflow-hidden transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen
                        ? "max-h-screen opacity-100"
                        : "max-h-0 opacity-0"
                } font-heading`}
            >
                {navLinks.map((link) => (
                    <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-textDark font-medium hover:text-primary transition-colors duration-200 ease-out relative pb-1 before:content-[''] before:absolute before:bottom-0 before:left-0 before:bg-primary before:transition-all before:duration-300 before:ease-out before:w-0 hover:before:w-full before:h-0.5"
                    >
                        {link.name}
                    </Link>
                ))}
                
                {user ? (
                    <div className="flex flex-col gap-3 pt-2 border-t border-backgroundDark/10">
                        <div className="flex items-center gap-2 text-textDark">
                            <User className="w-5 h-5 text-primary" />
                            <span className="font-medium">
                                {user.user_metadata.full_name || user.email}
                            </span>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleSignOut} fullWidth iconRight={<LogOut className="w-4 h-4" />}>
                            Выйти
                        </Button>
                    </div>
                ) : (
                    <Button size="sm" variant="primary" fullWidth onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/auth/login');
                    }}>
                        Войти
                    </Button>
                )}
            </div>
        </header>
    );
}
