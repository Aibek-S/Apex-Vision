import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Filter, Users } from "lucide-react";
import { Button } from "../../components/UI/button";
import { ArtifactCard, type Artifact } from "../../components/UI/artifact_card";
import { supabase } from "../../lib/supabase";

type PublicArtifact = Artifact & {
    is_public?: boolean;
};

export default function DashGallery() {
    const navigate = useNavigate();
    const [artifacts, setArtifacts] = useState<PublicArtifact[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredArtifacts = artifacts.filter((a) =>
        a.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        let isMounted = true;

        const fetchPublicArtifacts = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("artifacts")
                .select(
                    "id,name,status,created_at,updated_at,thumbnail_url,validation_status,image_count,is_public,user_id,capture_mode,last_capture_at"
                )
                .eq("is_public", true)
                .eq("status", "ready")
                .order("updated_at", { ascending: false });

            if (!isMounted) return;

            if (error) {
                setError(error.message);
            } else {
                setArtifacts((data ?? []) as PublicArtifact[]);
            }
            setLoading(false);
        };

        fetchPublicArtifacts();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleOpenArtifact = (artifact: PublicArtifact) => {
        // Navigate to the project details page
        // Note: This will only work if the user is the owner due to RLS
        // For public view, you might want to create a separate public details route
        navigate(`/dashboard/projects/${artifact.id}`);
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                        Работы сообщества
                    </p>
                    <h1 className="text-4xl font-black text-textDark tracking-tight">
                        <span className="text-primary">Галерея</span> артефактов
                    </h1>
                    <p className="text-base text-secondary/80 max-w-xl">
                        Исследуйте оцифрованные артефакты других пользователей и
                        вдохновляйтесь работами сообщества.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-textDark">
                        {artifacts.length} работ
                    </span>
                </div>
            </header>

            <section className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-textDark">
                            Публичные работы
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black">
                            {artifacts.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Поиск по названию..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all w-full md:w-[280px]"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/50"
                        >
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/60">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                        <p className="font-medium">
                            Загрузка работ сообщества...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
                        <p className="text-destructive font-semibold">
                            Упс! Что-то пошло не так
                        </p>
                        <p className="text-sm text-destructive/70 mt-1">
                            {error}
                        </p>
                        <p className="text-xs text-secondary/70 mt-3">
                            Возможно, нужно настроить RLS политику для
                            публичного доступа к артефактам.
                        </p>
                    </div>
                )}

                {!loading && !error && artifacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-[2rem] border-2 border-dashed border-black/5 bg-black/[0.02]">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-textDark">
                            Пока нет публичных работ
                        </h3>
                        <p className="text-secondary/70 text-center max-w-xs mt-2">
                            Станьте первым! Опубликуйте свой готовый артефакт в
                            галерее, чтобы поделиться им с сообществом.
                        </p>
                    </div>
                )}

                {!loading && !error && artifacts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredArtifacts.map((artifact) => (
                            <ArtifactCard
                                key={artifact.id}
                                artifact={artifact}
                                onClick={handleOpenArtifact}
                                // Don't show capture button for public gallery
                                // onCapture={undefined}
                            />
                        ))}
                    </div>
                )}

                {!loading &&
                    !error &&
                    artifacts.length > 0 &&
                    filteredArtifacts.length === 0 && (
                        <div className="py-20 text-center text-secondary/60">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Ничего не найдено по запросу "{searchQuery}"</p>
                        </div>
                    )}
            </section>
        </div>
    );
}
