import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Plus } from "lucide-react";
import { Button } from "../../components/UI/button";
import { ArtifactCard, type Artifact } from "../../components/UI/artifact_card";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/useAuth";

type ProjectRecord = Artifact & {
    updated_at?: string | null;
    user_id?: string | null;
};

export default function DashMain() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState<ProjectRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const displayName =
        user?.user_metadata?.full_name ??
        (user?.email ? user.email.split("@")[0] : "Исследователь");

    const filteredProjects = projects.filter((p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const fetchProjects = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("artifacts")
                .select(
                    "id,name,status,created_at,updated_at,user_id,thumbnail_url,validation_status,image_count,capture_mode,last_capture_at"
                )
                .eq("user_id", user.id)
                .order("updated_at", { ascending: false });

            if (!isMounted) return;

            if (error) {
                setError(error.message);
            } else {
                const uniqueProjects = (data ?? []).filter(
                    (project, index, self) =>
                        index === self.findIndex((p) => p.id === project.id)
                );
                setProjects(uniqueProjects as ProjectRecord[]);
            }
            setLoading(false);
        };

        fetchProjects();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleCreate = () => navigate("/dashboard/create");
    const handleOpenProject = (project: ProjectRecord) =>
        navigate(`/dashboard/projects/${project.id}`);
    const handleStartCapture = (project: ProjectRecord) =>
        navigate(`/dashboard/projects/${project.id}/capture`);

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                        Рабочее пространство
                    </p>
                    <h1 className="text-4xl font-black text-textDark tracking-tight">
                        Привет,{" "}
                        <span className="text-primary">{displayName}</span>
                    </h1>
                    <p className="text-base text-secondary/80 max-w-xl">
                        Управляйте вашими проектами и быстро переходите к
                        нужному артефакту.
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCreate}
                    className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Создать артефакт
                </Button>
            </header>

            <section className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-textDark">
                            Ваши проекты
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black">
                            {projects.length}
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
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/60">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                        <p className="font-medium">
                            Загрузка ваших шедевров...
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
                    </div>
                )}

                {!loading && !error && projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-[2rem] border-2 border-dashed border-black/5 bg-black/[0.02]">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <Plus className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-textDark">
                            Проектов пока нет
                        </h3>
                        <p className="text-secondary/70 text-center max-w-xs mt-2">
                            Начните с создания своего первого артефакта, чтобы
                            увидеть его здесь.
                        </p>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreate}
                            className="mt-6"
                        >
                            Создать первый артефакт
                        </Button>
                    </div>
                )}

                {!loading && !error && projects.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProjects.map((project) => (
                            <ArtifactCard
                                key={project.id}
                                artifact={project}
                                onClick={handleOpenProject}
                                onCapture={(artifact) =>
                                    handleStartCapture(
                                        artifact as ProjectRecord
                                    )
                                }
                            />
                        ))}
                    </div>
                )}

                {!loading &&
                    !error &&
                    projects.length > 0 &&
                    filteredProjects.length === 0 && (
                        <div className="py-20 text-center text-secondary/60">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Ничего не найдено по запросу "{searchQuery}"</p>
                        </div>
                    )}
            </section>
        </div>
    );
}
