import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Button } from "../../components/UI/button";
import { useAuth } from "../../contexts/useAuth";
import { supabase } from "../../lib/supabase";

type FindingRecord = {
    id: number;
    full_name: string;
    email: string;
    phone: string | null;
    city: string | null;
    region: string | null;
    object_type: string;
    object_description: string | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    weight_kg: number | null;
    material: string | null;
    location_text: string;
    latitude: number | null;
    longitude: number | null;
    photo_url: string | null;
    consent_info: boolean;
    consent_transfer: boolean;
    consent_name: boolean;
    status: string | null;
    submitted_at: string | null;
    museum_id: number;
};

const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("ru-RU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          });
};

const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") return String(value);
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
};

export default function DashInboxDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isMuseumStaff, isGuest, profileLoading } = useAuth();
    const [data, setData] = useState<FindingRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const statusLabel = useMemo(() => data?.status ?? "New", [data]);

    useEffect(() => {
        if (profileLoading) return;
        if (!user || !isMuseumStaff || isGuest) {
            navigate("/dashboard/gallery", { replace: true });
        }
    }, [user, isMuseumStaff, isGuest, profileLoading, navigate]);

    useEffect(() => {
        if (!id) return;
        let isMounted = true;

        const fetchDetails = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("findings")
                .select("*")
                .eq("id", Number(id))
                .single();

            if (!isMounted) return;
            if (error) {
                setError(error.message);
            } else {
                setData(data as FindingRecord);
            }
            setLoading(false);
        };

        fetchDetails();

        return () => {
            isMounted = false;
        };
    }, [id]);

    const updateStatus = async (nextStatus: "Accepted" | "Rejected") => {
        if (!data) return;
        setActionLoading(true);
        setError(null);
        const { error } = await supabase
            .from("findings")
            .update({ status: nextStatus })
            .eq("id", data.id);

        if (error) {
            setError(error.message);
        } else {
            setData((prev) => (prev ? { ...prev, status: nextStatus } : prev));
        }
        setActionLoading(false);
    };

    const deleteRequest = async () => {
        if (!data) return;
        setDeleting(true);
        setError(null);
        const { error } = await supabase
            .from("findings")
            .delete()
            .eq("id", data.id);

        if (error) {
            setError(error.message);
            setDeleting(false);
            return;
        }

        setDeleting(false);
        navigate("/dashboard/inbox");
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => navigate("/dashboard/inbox")}
                    >
                        Назад
                    </Button>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                        Письмо
                    </p>
                    <h1 className="text-3xl font-black text-textDark tracking-tight">
                        {data?.object_type ?? "Заявка"}
                    </h1>
                    <p className="text-sm text-secondary/80">
                        Получено: {formatDateTime(data?.submitted_at)}
                    </p>
                </div>
                <div className="flex flex-col items-start gap-3">
                    <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                        {statusLabel}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="primary"
                            iconLeft={<CheckCircle2 className="w-4 h-4" />}
                            onClick={() => updateStatus("Accepted")}
                            disabled={actionLoading || deleting}
                        >
                            Принять
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            iconLeft={<XCircle className="w-4 h-4" />}
                            onClick={() => updateStatus("Rejected")}
                            disabled={actionLoading || deleting}
                        >
                            Отказать
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            iconLeft={<Trash2 className="w-4 h-4" />}
                            onClick={() => deleteRequest()}
                            disabled={actionLoading || deleting}
                        >
                            Удалить
                        </Button>
                    </div>
                </div>
            </header>

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/60">
                    <p className="font-medium">Загрузка письма...</p>
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
                    <p className="text-destructive font-semibold">
                        Ошибка загрузки
                    </p>
                    <p className="text-sm text-destructive/70 mt-1">{error}</p>
                </div>
            )}

            {!loading && data && (
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                    <section className="space-y-6">
                        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-textDark">
                                Данные заявителя
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                                <Detail label="ФИО" value={data.full_name} />
                                <Detail label="Email" value={data.email} />
                                <Detail label="Телефон" value={data.phone} />
                                <Detail label="Город" value={data.city} />
                                <Detail label="Регион" value={data.region} />
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-textDark">
                                Описание находки
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                                <Detail label="Тип" value={data.object_type} />
                                <Detail
                                    label="Материал"
                                    value={data.material}
                                />
                                <Detail
                                    label="Описание"
                                    value={data.object_description}
                                />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-secondary">
                                <Detail
                                    label="Длина (см)"
                                    value={data.length_cm}
                                />
                                <Detail
                                    label="Ширина (см)"
                                    value={data.width_cm}
                                />
                                <Detail
                                    label="Высота (см)"
                                    value={data.height_cm}
                                />
                                <Detail
                                    label="Вес (кг)"
                                    value={data.weight_kg}
                                />
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-textDark">
                                Место находки
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                                <Detail
                                    label="Описание места"
                                    value={data.location_text}
                                />
                                <Detail
                                    label="Координаты"
                                    value={
                                        data.latitude && data.longitude
                                            ? `${data.latitude}, ${data.longitude}`
                                            : "—"
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-textDark">
                                Фото
                            </h2>
                            {data.photo_url ? (
                                <img
                                    src={data.photo_url}
                                    alt="Фото находки"
                                    className="w-full rounded-2xl border border-black/10 object-cover"
                                />
                            ) : (
                                <p className="text-sm text-secondary">
                                    Фото не приложено.
                                </p>
                            )}
                        </div>

                        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-3">
                            <h2 className="text-lg font-semibold text-textDark">
                                Согласия
                            </h2>
                            <ConsentItem
                                label="Подтверждение информации"
                                value={data.consent_info}
                            />
                            <ConsentItem
                                label="Передача находки"
                                value={data.consent_transfer}
                            />
                            <ConsentItem
                                label="Публикация имени"
                                value={data.consent_name}
                            />
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

type DetailProps = {
    label: string;
    value?: string | number | null;
};

function Detail({ label, value }: DetailProps) {
    return (
        <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary/60">
                {label}
            </p>
            <p className="text-sm text-textDark">{formatValue(value)}</p>
        </div>
    );
}

type ConsentItemProps = {
    label: string;
    value: boolean;
};

function ConsentItem({ label, value }: ConsentItemProps) {
    return (
        <div className="flex items-center justify-between text-sm text-secondary">
            <span>{label}</span>
            <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    value
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-destructive/10 text-destructive"
                }`}
            >
                {value ? "Да" : "Нет"}
            </span>
        </div>
    );
}
