import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    Lock,
    Mail,
    LogOut,
    Check,
    AlertCircle,
    Shield,
    Loader2,
} from "lucide-react";
import { Button } from "../../components/UI/button";
import { useAuth } from "../../contexts/useAuth";

export default function DashSettings() {
    const navigate = useNavigate();
    const { user, signOut, updatePassword, updateEmail } = useAuth();

    // Password change state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // Email change state
    const [newEmail, setNewEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordMessage(null);

        if (!newPassword || !confirmPassword) {
            setPasswordMessage({
                type: "error",
                text: "Заполните оба поля пароля",
            });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({
                type: "error",
                text: "Пароль должен содержать минимум 6 символов",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({
                type: "error",
                text: "Пароли не совпадают",
            });
            return;
        }

        setPasswordLoading(true);

        const { error } = await updatePassword(newPassword);

        if (error) {
            setPasswordMessage({
                type: "error",
                text: error.message,
            });
        } else {
            setPasswordMessage({
                type: "success",
                text: "Пароль успешно обновлён!",
            });
            setNewPassword("");
            setConfirmPassword("");
        }

        setPasswordLoading(false);
    };

    const handleEmailChange = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setEmailMessage(null);

        if (!newEmail) {
            setEmailMessage({
                type: "error",
                text: "Введите новый email",
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setEmailMessage({
                type: "error",
                text: "Введите корректный email адрес",
            });
            return;
        }

        if (newEmail === user?.email) {
            setEmailMessage({
                type: "error",
                text: "Новый email совпадает с текущим",
            });
            return;
        }

        setEmailLoading(true);

        const { error } = await updateEmail(newEmail);

        if (error) {
            setEmailMessage({
                type: "error",
                text: error.message,
            });
        } else {
            setEmailMessage({
                type: "success",
                text: "Проверьте новую почту для подтверждения изменений",
            });
            setNewEmail("");
        }

        setEmailLoading(false);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth/login");
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                    Настройки аккаунта
                </p>
                <h1 className="text-4xl font-black text-textDark tracking-tight">
                    <span className="text-primary">Безопасность</span> и вход
                </h1>
                <p className="text-base text-secondary/80 max-w-xl">
                    Управляйте паролем, email и параметрами входа в систему.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Change Password */}
                <div className="space-y-6 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Безопасность
                            </p>
                            <h2 className="text-xl font-bold text-textDark">
                                Смена пароля
                            </h2>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handlePasswordChange}>
                        <label className="space-y-1 text-sm text-secondary block">
                            <span>Новый пароль</span>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(event) =>
                                    setNewPassword(event.target.value)
                                }
                                placeholder="Минимум 6 символов"
                                className="w-full rounded-xl border border-white/50 bg-background/40 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </label>

                        <label className="space-y-1 text-sm text-secondary block">
                            <span>Подтвердите пароль</span>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                placeholder="Повторите пароль"
                                className="w-full rounded-xl border border-white/50 bg-background/40 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </label>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={passwordLoading}
                            fullWidth
                        >
                            {passwordLoading ? "Обновление..." : "Обновить пароль"}
                        </Button>

                        {passwordMessage && (
                            <div
                                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                                    passwordMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : "bg-red-50 text-red-700 border border-red-100"
                                }`}
                            >
                                {passwordMessage.type === "success" ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <AlertCircle className="w-4 h-4" />
                                )}
                                {passwordMessage.text}
                            </div>
                        )}
                    </form>
                </div>

                {/* Change Email */}
                <div className="space-y-6 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Контакты
                            </p>
                            <h2 className="text-xl font-bold text-textDark">
                                Смена email
                            </h2>
                        </div>
                    </div>

                    <div className="space-y-2 rounded-xl bg-backgroundLight/60 px-4 py-3">
                        <p className="text-xs uppercase tracking-wider text-secondary/70 font-bold">
                            Текущий email
                        </p>
                        <p className="text-sm font-medium text-textDark break-all">
                            {user?.email ?? "—"}
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleEmailChange}>
                        <label className="space-y-1 text-sm text-secondary block">
                            <span>Новый email</span>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(event) =>
                                    setNewEmail(event.target.value)
                                }
                                placeholder="example@domain.com"
                                className="w-full rounded-xl border border-white/50 bg-background/40 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </label>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={emailLoading}
                            fullWidth
                        >
                            {emailLoading ? "Отправка..." : "Обновить email"}
                        </Button>

                        {emailMessage && (
                            <div
                                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                                    emailMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : "bg-red-50 text-red-700 border border-red-100"
                                }`}
                            >
                                {emailMessage.type === "success" ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <AlertCircle className="w-4 h-4" />
                                )}
                                {emailMessage.text}
                            </div>
                        )}

                        <p className="text-xs text-secondary/70">
                            После изменения email вам будет отправлено письмо с
                            подтверждением на новый адрес.
                        </p>
                    </form>
                </div>
            </div>

            {/* Sign Out Section */}
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-900">
                                Выход из аккаунта
                            </h3>
                            <p className="text-sm text-red-700/80 mt-1">
                                Завершите текущий сеанс работы. Вы сможете войти
                                снова в любое время.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleSignOut}
                        className="border-red-200 text-red-700 hover:bg-red-100 md:shrink-0"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Выйти
                    </Button>
                </div>
            </div>
        </div>
    );
}
