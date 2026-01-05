import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/UI/button";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Wait a bit then redirect or show message
            setTimeout(() => navigate("/auth/login"), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl -z-10" />

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
                        Регистрация
                    </h1>
                    <p className="text-secondary">
                        Создайте свой аккаунт Apex-Vision
                    </p>
                </div>

                {success ? (
                    <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
                        <h2 className="text-green-800 font-bold text-lg mb-2">
                            Успешно!
                        </h2>
                        <p className="text-green-700">
                            Проверьте вашу почту для подтверждения регистрации.
                            Перенаправление на вход...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) =>
                                            setFullName(e.target.value)
                                        }
                                        placeholder="ФИО пользователя"
                                        required
                                        className="text-sm w-full h-12 pl-12 pr-4 bg-white/80 border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
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

                        {error && (
                            <p className="text-red-500 text-sm text-center font-medium">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            loading={loading}
                            fullWidth
                            size="lg"
                        >
                            Создать аккаунт
                        </Button>
                    </form>
                )}

                <div className="text-center text-sm text-secondary">
                    Уже есть аккаунт?{" "}
                    <Link
                        to="/auth/login"
                        className="text-primary font-bold hover:underline"
                    >
                        Войти
                    </Link>
                </div>
            </div>
        </div>
    );
}
