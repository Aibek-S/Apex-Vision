import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/UI/button";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isMuseumStaff, setIsMuseumStaff] = useState(false);
    const [museumCode, setMuseumCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Получаем путь, с которого пришли, или главную страницу по умолчанию
    const from = location.state?.from?.pathname || "/dashboard";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const staffCode =
            import.meta.env.VITE_MUSEUM_STAFF_CODE || "MUSEUM-2026";

        if (isMuseumStaff && museumCode.trim() !== staffCode) {
            setError("Неверный спец-код сотрудника музея");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl -z-10" />

            <Link
                to="/"
                className="absolute top-5 left-5 sm:top-10 sm:left-10 flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>Назад</span>
            </Link>

            <div className="w-full max-w-md bg-white/50 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-logo font-medium text-textDark">
                        Вход
                    </h1>
                    <p className="text-secondary">Добро пожаловать обратно!</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email пользователя"
                                    required
                                    className="text-sm w-full h-12 pl-12 pr-4 bg-white/80 border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Пароль"
                                    required
                                    className="text-sm w-full h-12 pl-12 pr-4 bg-white/80 border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-secondary/15 bg-white/70 p-4">
                        <label className="flex items-center gap-3 text-sm text-textDark">
                            <input
                                type="checkbox"
                                checked={isMuseumStaff}
                                onChange={(e) =>
                                    setIsMuseumStaff(e.target.checked)
                                }
                                className="h-4 w-4 accent-primary"
                            />
                            Вы из музея?
                        </label>
                        <p className="mt-2 text-xs text-secondary">
                            Если вы сотрудник музея, включите переключатель и
                            введите спец-код.
                        </p>

                        {isMuseumStaff && (
                            <div className="mt-3 space-y-2">
                                <input
                                    type="password"
                                    value={museumCode}
                                    onChange={(e) =>
                                        setMuseumCode(e.target.value)
                                    }
                                    placeholder="Секретный спец-код"
                                    required
                                    className="text-sm w-full h-11 px-4 bg-white/80 border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center font-medium">
                            {error}
                        </p>
                    )}

                    <Button type="submit" loading={loading} fullWidth size="lg">
                        Войти
                    </Button>
                </form>

                <div className="text-center text-sm text-secondary">
                    Нет аккаунта?{" "}
                    <Link
                        to="/auth/register"
                        className="text-primary font-bold hover:underline"
                    >
                        Зарегистрироваться
                    </Link>
                </div>
            </div>
        </div>
    );
}
