import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailOpen, Search } from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/UI/button";

type FindingRecord = {
    id: number;
    full_name: string;
    email: string;
    object_type: string;
    location_text: string;
    status: string | null;
    submitted_at: string | null;
};

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          });
};

const statusStyles: Record<string, string> = {
    New: "bg-primary/10 text-primary",
    Accepted: "bg-emerald-500/10 text-emerald-600",
    Rejected: "bg-destructive/10 text-destructive",
};

export default function DashInbox() {
    const navigate = useNavigate();
    const { user, isMuseumStaff, isGuest, profileLoading } = useAuth();
    const [requests, setRequests] = useState<FindingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (profileLoading) return;
        if (!user || !isMuseumStaff || isGuest) {
            navigate("/dashboard/gallery", { replace: true });
        }
    }, [user, isMuseumStaff, isGuest, profileLoading, navigate]);

    useEffect(() => {
        if (!user || !isMuseumStaff) return;
        let isMounted = true;

        const fetchRequests = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("findings")
                .select(
                    "id,full_name,email,object_type,location_text,status,submitted_at",
                )
                .order("submitted_at", { ascending: false });

            if (!isMounted) return;
            if (error) {
                setError(error.message);
            } else {
                setRequests((data ?? []) as FindingRecord[]);
            }
            setLoading(false);
        };

        fetchRequests();

        return () => {
            isMounted = false;
        };
    }, [user, isMuseumStaff]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return requests;
        return requests.filter(
            (item) =>
                item.full_name.toLowerCase().includes(needle) ||
                item.email.toLowerCase().includes(needle) ||
                item.object_type.toLowerCase().includes(needle),
        );
    }, [requests, query]);

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                        Входящие
                    </p>
                    <h1 className="text-4xl font-black text-textDark tracking-tight">
                        Заявки от жителей
                    </h1>
                    <p className="text-base text-secondary/80 max-w-xl">
                        Открывайте обращения и принимайте решения по находкам.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Поиск по имени или теме..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all w-full md:w-[280px]"
                        />
                    </div>
                </div>
            </header>

            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-black/5 pb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-textDark">
                            Письма
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black">
                            {filtered.length}
                        </span>
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/60">
                        <MailOpen className="h-10 w-10 animate-pulse text-primary/40" />
                        <p className="font-medium">Загружаем входящие...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
                        <p className="text-destructive font-semibold">
                            Ошибка загрузки
                        </p>
                        <p className="text-sm text-destructive/70 mt-1">
                            {error}
                        </p>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-[2rem] border-2 border-dashed border-black/5 bg-black/[0.02]">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <MailOpen className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-textDark">
                            Пока нет заявок
                        </h3>
                        <p className="text-secondary/70 text-center max-w-xs mt-2">
                            Здесь появятся обращения от жителей.
                        </p>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="space-y-3">
                        {filtered.map((item) => (
                            <article
                                key={item.id}
                                className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm transition hover:shadow-md"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm uppercase tracking-[0.2em] text-secondary/60">
                                            {formatDate(item.submitted_at)}
                                        </p>
                                        <h3 className="text-lg font-semibold text-textDark">
                                            {item.object_type}
                                        </h3>
                                        <p className="text-sm text-secondary">
                                            {item.full_name} · {item.email}
                                        </p>
                                        <p className="text-sm text-secondary/80">
                                            {item.location_text}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-start md:items-end gap-3">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                statusStyles[
                                                    item.status ?? "New"
                                                ] ??
                                                "bg-secondary/10 text-secondary"
                                            }`}
                                        >
                                            {item.status ?? "New"}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                navigate(
                                                    `/dashboard/inbox/${item.id}`,
                                                )
                                            }
                                        >
                                            Открыть письмо
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
