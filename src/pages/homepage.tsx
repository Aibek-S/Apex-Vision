import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/layouts/header";
import { Button } from "../components/UI/button";
import {
    Camera,
    Box,    
    Eye,
    Share2,
    ArrowRight,
    Info,
    Image,
    Mail,
    Phone,
    HelpCircle,
} from "lucide-react";
import ModelViewer from "../components/canvas/ModelViewer";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../lib/supabase";
import { ArtifactCard, type Artifact } from "../components/UI/artifact_card";

const ProcessStep: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    isActive: boolean;
    index: number;
    onHover: () => void;
}> = ({ icon, title, description, isActive, index, onHover }) => (
    <div
        onMouseEnter={onHover}
        className={`relative flex flex-col items-center space-y-3 transition-all duration-500 cursor-pointer p-2 rounded-xl ${
            isActive
                ? "opacity-100 scale-105 bg-white/30"
                : "opacity-70 scale-95"
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
    >
        <div
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isActive
                    ? "bg-primary text-white shadow-xl shadow-primary/40 rotate-3"
                    : "bg-backgroundDark/40 text-secondary -rotate-3 hover:rotate-0"
            }`}
        >
            <div className="scale-75 sm:scale-100">{icon}</div>
        </div>
        <div className="text-center">
            <h3
                className={`font-bold text-xs sm:text-base transition-colors leading-tight ${
                    isActive ? "text-primary" : "text-textDark"
                }`}
            >
                {title}
            </h3>
            <p className="text-[10px] sm:text-xs leading-tight text-secondary mt-1 font-medium">
                {description}
            </p>
        </div>
        {index < 3 && (
            <ArrowRight
                className={`w-5 h-5 transition-colors hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 ${
                    isActive ? "text-primary" : "text-backgroundDark/30"
                }`}
            />
        )}
    </div>
);

const steps = [
    {
        icon: <Camera className="w-8 h-8" />,
        title: "Сканируй",
        description: "Загрузи фотографии",
    },
    {
        icon: <Box className="w-8 h-8" />,
        title: "Получи 3D модель",
        description: "Автоматическая обработка",
    },
    {
        icon: <Eye className="w-8 h-8" />,
        title: "Исследуй",
        description: "Изучи детали",
    },
    {
        icon: <Share2 className="w-8 h-8" />,
        title: "Поделись",
        description: "С миром",
    },
];

export default function Home() {
    const [activeStep, setActiveStep] = useState(0);
    const [publicArtifacts, setPublicArtifacts] = useState<Artifact[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading } = useAuth();

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (!loading && user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, loading, navigate]);

    // Smooth scroll to hash sections
    useEffect(() => {
        const hash = location.hash.replace("#", "");
        if (hash) {
            // Small delay to ensure the DOM is ready
            setTimeout(() => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }
            }, 100);
        }
    }, [location.hash]);

    // Fetch public artifacts for gallery
    useEffect(() => {
        const fetchPublicArtifacts = async () => {
            setLoadingGallery(true);
            const { data, error } = await supabase
                .from("artifacts")
                .select(
                    "id,name,status,created_at,updated_at,thumbnail_url,validation_status,image_count,is_public,user_id,capture_mode,last_capture_at"
                )
                .eq("is_public", true)
                .eq("status", "ready")
                .order("updated_at", { ascending: false })
                .limit(8);

            if (!error && data) {
                setPublicArtifacts(data as Artifact[]);
            }
            setLoadingGallery(false);
        };

        fetchPublicArtifacts();
    }, []);

    const handlePublicArtifactClick = () => {
        navigate("/auth/login");
    };

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <Header />

            <section className="relative min-h-[calc(100vh-80px)] flex items-center px-4 py-12 sm:px-6 lg:px-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-background via-white to-background/50 pointer-events-none" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="hidden sm:block absolute top-10 left-10 w-48 h-48 sm:w-64 sm:h-64 bg-primary/5 rounded-full blur-3xl" />
                    <div className="hidden sm:block absolute bottom-10 right-10 w-60 h-60 sm:w-80 sm:h-80 bg-secondary/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-12 lg:grid lg:grid-cols-2 lg:items-center">
                    <div className="space-y-8 animate-fade-in order-2 lg:order-1">
                        <div className="space-y-4 text-center lg:text-left">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-textDark leading-tight tracking-tight">
                                Прошлое в{" "}
                                <span className="text-primary relative inline-block">
                                    новом измерении
                                    <span className="absolute -bottom-1 left-0 w-full h-2 bg-primary/20 -z-10" />
                                </span>
                            </h1>
                            <p className="mx-auto lg:mx-0 max-w-2xl text-lg sm:text-xl text-secondary leading-relaxed">
                                Цифровизация артефактов через 3D-модели.
                                <br className="hidden sm:block" />
                                Быстро. Безопасно. Современно.
                            </p>
                        </div>

                        <div className="space-y-6 rounded-3xl border border-white/50 bg-white/40 p-6 backdrop-blur-md sm:p-8 shadow-xl shadow-primary/5">
                            <h2 className="text-xl font-bold text-textDark text-center lg:text-left">
                                Как это работает:
                            </h2>
                            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
                                {steps.map((step, index) => (
                                    <ProcessStep
                                        key={index}
                                        icon={step.icon}
                                        title={step.title}
                                        description={step.description}
                                        isActive={activeStep === index}
                                        index={index}
                                        onHover={() => setActiveStep(index)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Button
                                size="lg"
                                variant="primary"
                                className="w-full sm:w-auto text-lg h-14 px-8"
                                onClick={() => navigate("/auth/register")}
                            >
                                Начать работу
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto text-lg h-14 px-8"
                            >
                                Узнать больше
                            </Button>
                        </div>
                    </div>

                    <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[520px] order-1 lg:order-2 animate-fade-in hidden md:block">
                        <div className="absolute inset-0 bg-gradient-to-br from-backgroundDark/30 to-white/50 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80">
                            <ModelViewer
                                modelUrl="/assets/models/model.glb"
                                followCursor
                                rotationStrength={0.3}
                                smoothness={0.08}
                                baseRotation={[0, -Math.PI / 2, 0]}
                            />
                        </div>
                        {/* Decorative elements around the model */}
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl -z-10" />
                        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -z-10" />
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section
                id="about"
                className="relative px-4 py-12 sm:px-6 lg:px-10 sm:py-20 bg-white"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="text-center space-y-4 mb-12">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Info className="w-8 h-8 text-primary" />
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-textDark">
                                <span className="text-primary">О проекте</span>
                            </h2>
                        </div>
                        <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                            Apex-Vision — это современная платформа для
                            цифровизации физических объектов через создание
                            3D-моделей на основе фотографий.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-backgroundLight/50 backdrop-blur-md border border-white/60 rounded-3xl p-6 sm:p-8 space-y-4 hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Camera className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-textDark">
                                Простота использования
                            </h3>
                            <p className="text-secondary leading-relaxed">
                                Загрузите фотографии объекта с разных ракурсов,
                                и наша система автоматически создаст 3D-модель.
                            </p>
                        </div>

                        <div className="bg-backgroundLight/50 backdrop-blur-md border border-white/60 rounded-3xl p-6 sm:p-8 space-y-4 hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                                <Box className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-textDark">
                                Высокое качество
                            </h3>
                            <p className="text-secondary leading-relaxed">
                                Используем современные алгоритмы фотограмметрии
                                для создания детализированных 3D-моделей.
                            </p>
                        </div>

                        <div className="bg-backgroundLight/50 backdrop-blur-md border border-white/60 rounded-3xl p-6 sm:p-8 space-y-4 hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Share2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-textDark">
                                Делитесь результатами
                            </h3>
                            <p className="text-secondary leading-relaxed">
                                Публикуйте свои работы в галерее, делитесь ими с
                                коллегами и сообществом.
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <Button
                            size="lg"
                            variant="primary"
                            onClick={() => navigate("/auth/register")}
                            className="text-lg h-14 px-8"
                        >
                            Начать работу бесплатно
                        </Button>
                    </div>
                </div>
            </section>

            {/* Gallery Section */}
            <section
                id="gallery"
                className="relative px-4 py-12 sm:px-6 lg:px-10 sm:py-20 bg-backgroundLight/30"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="text-center space-y-4 mb-10 sm:mb-12">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Image className="w-8 h-8 text-primary" />
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-textDark">
                                Публичная{" "}
                                <span className="text-primary">галерея</span>
                            </h2>
                        </div>
                        <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                            Работы сообщества — посмотрите, что создали другие
                            пользователи. Войдите, чтобы увидеть подробности и
                            создать свои проекты.
                        </p>
                    </div>

                    {loadingGallery && (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-secondary">
                                    Загрузка галереи...
                                </p>
                            </div>
                        </div>
                    )}

                    {!loadingGallery && publicArtifacts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border-2 border-dashed border-black/10 bg-white/40">
                            <Image className="w-16 h-16 text-primary/20 mb-4" />
                            <h3 className="text-xl font-bold text-textDark mb-2">
                                Пока нет публичных работ
                            </h3>
                            <p className="text-secondary text-center max-w-md">
                                Станьте первым! Зарегистрируйтесь и опубликуйте
                                свой первый артефакт.
                            </p>
                        </div>
                    )}

                    {!loadingGallery && publicArtifacts.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {publicArtifacts.map((artifact) => (
                                    <ArtifactCard
                                        key={artifact.id}
                                        artifact={artifact}
                                        onClick={handlePublicArtifactClick}
                                    />
                                ))}
                            </div>
                            <div className="mt-12 text-center">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => navigate("/auth/login")}
                                    className="text-lg h-14 px-8"
                                >
                                    Войти, чтобы увидеть больше
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Support Section */}
            <section
                id="support"
                className="relative px-4 py-12 sm:px-6 lg:px-10 sm:py-20 bg-white"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="text-center space-y-4 mb-12">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <HelpCircle className="w-8 h-8 text-primary" />
                            <h2 className="text-4xl sm:text-5xl font-black text-textDark">
                                <span className="text-primary">Поддержка</span>{" "}
                                и контакты
                            </h2>
                        </div>
                        <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                            Есть вопросы? Мы всегда готовы помочь. Свяжитесь с
                            нами удобным способом.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <a
                            href="mailto:ajbeksuundik@gmail.com"
                            className="flex items-center gap-6 bg-backgroundLight/50 backdrop-blur-md border border-white/60 rounded-3xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                <Mail className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-textDark mb-1">
                                    Email
                                </h3>
                                <p className="text-primary font-medium break-all">
                                    ajbeksuundik@gmail.com
                                </p>
                            </div>
                        </a>

                        <a
                            href="tel:+77758935407"
                            className="flex items-center gap-6 bg-backgroundLight/50 backdrop-blur-md border border-white/60 rounded-3xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all">
                                <Phone className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-textDark mb-1">
                                    Телефон
                                </h3>
                                <p className="text-secondary font-medium">
                                    +7 775 893 5407
                                </p>
                            </div>
                        </a>
                    </div>

                    <div className="mt-12 bg-primary/5 border border-primary/20 rounded-3xl p-8 max-w-4xl mx-auto">
                        <h3 className="text-2xl font-bold text-textDark mb-4 text-center">
                            Часто задаваемые вопросы
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-white/70 rounded-2xl p-6">
                                <h4 className="font-bold text-textDark mb-2">
                                    Как начать работу?
                                </h4>
                                <p className="text-secondary text-sm">
                                    Зарегистрируйтесь, создайте новый артефакт и
                                    загрузите 20-30 фотографий объекта с разных
                                    ракурсов. Система автоматически обработает
                                    их и создаст 3D-модель.
                                </p>
                            </div>
                            <div className="bg-white/70 rounded-2xl p-6">
                                <h4 className="font-bold text-textDark mb-2">
                                    Какие форматы фотографий поддерживаются?
                                </h4>
                                <p className="text-secondary text-sm">
                                    Мы поддерживаем JPG, PNG, WEBP, HEIC и HEIF
                                    форматы. Максимальный размер одного файла —
                                    10 МБ.
                                </p>
                            </div>
                            <div className="bg-white/70 rounded-2xl p-6">
                                <h4 className="font-bold text-textDark mb-2">
                                    Сколько времени занимает обработка?
                                </h4>
                                <p className="text-secondary text-sm">
                                    Время обработки зависит от количества
                                    фотографий и сложности объекта. Обычно это
                                    занимает от нескольких минут до часа.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-secondary mb-4">
                            Не нашли ответ на свой вопрос?
                        </p>
                        <Button
                            size="lg"
                            variant="primary"
                            onClick={() => navigate("/auth/register")}
                            className="text-lg h-14 px-8"
                        >
                            Присоединяйтесь к нам
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
