import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layouts/header";
import { Button } from "../components/UI/button";
import { Camera, Box, Eye, Share2, ArrowRight } from "lucide-react";
import ModelViewer from "../components/canvas/ModelViewer";
import { useAuth } from "../contexts/useAuth";

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
        className={`flex flex-col items-center space-y-2 transition-all duration-500 cursor-pointer ${
            isActive ? "opacity-100 scale-105" : "opacity-60 scale-95"
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
    >
        <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/50"
                    : "bg-backgroundDark/50 text-secondary"
            }`}
        >
            {icon}
        </div>
        <div className="text-center">
            <h3
                className={`font-bold text-base transition-colors ${
                    isActive ? "text-primary" : "text-textDark"
                }`}
            >
                {title}
            </h3>
            <p className="text-xs leading-tight text-secondary mt-1">
                {description}
            </p>
        </div>
        {index < 4 && (
            <ArrowRight
                className={`w-5 h-5 transition-colors hidden md:block ${
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
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, loading, navigate]);

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <section className="relative min-h-[calc(100vh-80px)] flex items-center px-4 py-6 sm:px-6 lg:px-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-background via-white to-background/50 pointer-events-none" />
                <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-center">
                    <div className="space-y-8 animate-fade-in">
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-textDark leading-tight tracking-tight">
                                Будущее в{" "}
                                <span className="text-primary relative inline-block">
                                    новом измерении
                                    <span className="absolute -bottom-1 left-0 w-full h-2 bg-primary/20 -z-10" />
                                </span>
                            </h1>
                            <p className="max-w-2xl text-base sm:text-lg md:text-xl text-secondary leading-relaxed">
                                Цифровизация артефактов через 3D-модели.
                                <br />
                                Быстро. Безопасно. Современно.
                            </p>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-white/50 bg-white/60 p-4 backdrop-blur-sm sm:p-6">
                            <h2 className="text-xl font-bold text-textDark">
                                Как это работает:
                            </h2>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
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

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                size="lg"
                                variant="primary"
                                onClick={() => navigate("/auth/register")}
                            >
                                Начать работу
                            </Button>
                            <Button size="lg" variant="outline">
                                Узнать больше
                            </Button>
                        </div>
                    </div>

                    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] hidden sm:block">
                        <div className="absolute inset-0 bg-gradient-to-br from-backgroundDark/20 to-white/40 rounded-3xl shadow-xl overflow-hidden border border-white/60">
                            <ModelViewer
                                modelUrl="/assets/models/model.glb"
                                followCursor
                                rotationStrength={0.3}
                                smoothness={0.08}
                                baseRotation={[0, -Math.PI / 2, 0]}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
