import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/UI/button";
import type { Artifact } from "../../components/UI/artifact_card";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/useAuth";

const statusOptions: Artifact["status"][] = [
    "created",
    "processing",
    "ready",
    "error",
];

export default function DashCreate() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [status, setStatus] = useState<Artifact["status"]>("created");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);

        if (!user) {
            setMessage("Сначала войдите в систему, чтобы сохранить артефакт.");
            return;
        }

        if (!name.trim()) {
            setMessage("Введите название артефакта.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.from("artifacts").insert({
            name: name.trim(),
            status,
            user_id: user.id,
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage("Артефакт создан. Обновите список, чтобы увидеть его.");
            setName("");
        }

        setLoading(false);
    };

    const handleCancel = () => navigate(-1);

    return (
        <div className="space-y-6 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
            <header className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    Создать артефакт
                </p>
                <h1 className="text-2xl font-semibold text-textDark">
                    Добавьте новую работу в ваш кабинет
                </h1>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="space-y-1 text-sm text-secondary">
                    <span>Название</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Например, Фрагмент мрамора"
                        className="w-full rounded-xl border border-white/50 bg-background/40 px-4 py-2 text-textDark focus:border-primary focus:outline-none"
                    />
                </label>

                <label className="space-y-1 text-sm text-secondary">
                    <span>Статус</span>
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value as Artifact["status"])
                        }
                        className="w-full rounded-xl border border-white/50 bg-background/40 px-4 py-2 text-textDark focus:border-primary focus:outline-none"
                    >
                        {statusOptions.map((option) => (
                            <option key={option} value={option}>
                                {option === "created" && "Создана"}
                                {option === "processing" && "В работе"}
                                {option === "ready" && "Готова"}
                                {option === "error" && "Ошибка"}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="flex flex-wrap gap-3">
                    <Button type="submit" variant="primary" loading={loading}>
                        Сохранить артефакт
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                    >
                        Отмена
                    </Button>
                </div>
                {message && (
                    <p className="text-sm text-secondary leading-relaxed">
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}
