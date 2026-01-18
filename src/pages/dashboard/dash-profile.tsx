import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    User,
    Mail,
    Calendar,
    Loader2,
    Check,
    Lock,
    LogOut,
    AlertCircle,
    Shield,
} from "lucide-react";
import { Button } from "../../components/UI/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/useAuth";

type Profile = {
    id: string;
    full_name: string | null;
    updated_at: string | null;
};

export default function DashProfile() {
    const navigate = useNavigate();
    const { user, signOut, updatePassword, updateEmail } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [newEmail, setNewEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, updated_at")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                // Profile might not exist yet, that's okay
                setProfile(null);
            } else {
                setProfile(data);
                setFullName(data.full_name || "");
            }
            setLoading(false);
        };

        fetchProfile();
    }, [user]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);

        if (!user) {
            setMessage({ type: "error", text: "Пользователь не авторизован" });
            return;
        }

        if (!fullName.trim()) {
            setMessage({
                type: "error",
                text: "Введите имя (минимум 3 символа)",
            });
            return;
        }

        if (fullName.trim().length < 3) {
            setMessage({
                type: "error",
                text: "Имя должно содержать минимум 3 символа",
            });
            return;
        }

        setSaving(true);

        const { error } = await supabase.from("profiles").upsert({
            id: user.id,
            full_name: fullName.trim(),
            updated_at: new Date().toISOString(),
        });

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Профиль успешно обновлён!" });
            // Update local profile state
            setProfile({
                id: user.id,
                full_name: fullName.trim(),
                updated_at: new Date().toISOString(),
            });
        }

        setSaving(false);
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

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
                    Профиль пользователя
                </p>
                <h1 className="text-4xl font-black text-textDark tracking-tight">
                    Ваш <span className="text-primary">профиль</span>
                </h1>
                <p className="text-base text-secondary/80 max-w-xl">
                    Управляйте своими данными и персонализируйте опыт работы с
                    платформой.
                </p>
            </header>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                </div>
            )}

            {!loading && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Profile Edit Form */}
                    <div className="space-y-6 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Редактировать профиль
                            </p>
                            <h2 className="text-2xl font-semibold text-textDark">
                                Личные данные
                            </h2>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <label className="space-y-1 text-sm text-secondary block">
                                <span className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Полное имя
                                </span>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(event) =>
                                        setFullName(event.target.value)
                                    }
                                    placeholder="Например, Иван Петров"
                                    className="w-full rounded-xl border border-white/50 bg-background/40 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <span className="text-xs text-secondary/70">
                                    Минимум 3 символа
                                </span>
                            </label>

                            <div className="flex flex-wrap gap-3 pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={saving}
                                >
                                    {saving
                                        ? "Сохранение..."
                                        : "Сохранить изменения"}
                                </Button>
                            </div>

                            {message && (
                                <div
                                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                                        message.type === "success"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                            : "bg-red-50 text-red-700 border border-red-100"
                                    }`}
                                >
                                    {message.type === "success" && (
                                        <Check className="w-4 h-4" />
                                    )}
                                    {message.text}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Profile Info Card */}
                    <div className="space-y-6 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Информация
                            </p>
                            <h2 className="text-2xl font-semibold text-textDark">
                                Данные аккаунта
                            </h2>
                        </div>

                        <dl className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <dt className="text-xs uppercase tracking-wider text-secondary/70 font-bold">
                                        Email
                                    </dt>
                                    <dd className="text-sm font-medium text-textDark break-all mt-0.5">
                                        {user?.email ?? "—"}
                                    </dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <dt className="text-xs uppercase tracking-wider text-secondary/70 font-bold">
                                        Отображаемое имя
                                    </dt>
                                    <dd className="text-sm font-medium text-textDark mt-0.5">
                                        {profile?.full_name || "Не указано"}
                                    </dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <dt className="text-xs uppercase tracking-wider text-secondary/70 font-bold">
                                        Дата регистрации
                                    </dt>
                                    <dd className="text-sm font-medium text-textDark mt-0.5">
                                        {formatDate(user?.created_at)}
                                    </dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <dt className="text-xs uppercase tracking-wider text-secondary/70 font-bold">
                                        Последнее обновление профиля
                                    </dt>
                                    <dd className="text-sm font-medium text-textDark mt-0.5">
                                        {formatDate(profile?.updated_at)}
                                    </dd>
                                </div>
                            </div>
                        </dl>

                        <div className="pt-4 border-t border-black/5">
                            <p className="text-xs text-secondary/70">
                                ID:{" "}
                                <span className="font-mono text-[10px]">
                                    {user?.id}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <section className="space-y-6">
                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                        Настройки аккаунта
                    </p>
                    <h2 className="text-3xl font-black text-textDark tracking-tight">
                        <span className="text-primary">Безопасность</span> и вход
                    </h2>
                    <p className="text-base text-secondary/80 max-w-xl">
                        Управляйте паролем, email и параметрами входа в систему.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
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

                        <form
                            className="space-y-4"
                            onSubmit={handlePasswordChange}
                        >
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
                                {passwordLoading
                                    ? "Обновление..."
                                    : "Обновить пароль"}
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

                        <form
                            className="space-y-4"
                            onSubmit={handleEmailChange}
                        >
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
                                {emailLoading
                                    ? "Отправка..."
                                    : "Обновить email"}
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
                                После изменения email вам будет отправлено
                                письмо с подтверждением на новый адрес.
                            </p>
                        </form>
                    </div>
                </div>

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
                                    Завершите текущий сеанс работы. Вы сможете
                                    войти снова в любое время.
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
            </section>
        </div>
    );
}
