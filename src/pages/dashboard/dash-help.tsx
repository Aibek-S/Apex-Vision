import { useState } from "react";
import {
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Mail,
    FileText,
    Camera,
    Upload,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { Button } from "../../components/UI/button";

type FAQItem = {
    id: string;
    question: string;
    answer: string;
    icon: React.ReactNode;
};

const faqData: FAQItem[] = [
    {
        id: "getting-started",
        question: "Как начать работу с платформой?",
        answer: "После регистрации перейдите в раздел «Главная» и нажмите кнопку «Создать артефакт». Введите название вашего объекта и начните процесс оцифровки. Вы можете загружать фотографии вручную или подключить устройство для автоматической съёмки.",
        icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
        id: "capture-modes",
        question: "Какие режимы съёмки доступны?",
        answer: "Платформа поддерживает два режима: Manual Upload — для загрузки фотографий с компьютера, и Device Capture (ESP) — для автоматической съёмки с подключённого устройства. Выберите подходящий режим при создании сессии захвата.",
        icon: <Camera className="w-5 h-5" />,
    },
    {
        id: "upload-limits",
        question: "Какие ограничения на загрузку фотографий?",
        answer: "Каждая фотография должна быть в формате .jpg, .png или .webp и не превышать 10 МБ. Вы можете загружать любое количество изображений для одного артефакта. Для лучшего результата рекомендуется минимум 20-30 фотографий с разных ракурсов.",
        icon: <Upload className="w-5 h-5" />,
    },
    {
        id: "status-meanings",
        question: "Что означают статусы артефактов?",
        answer: "«Создан» — артефакт только что добавлен; «В обработке» — идёт анализ и построение модели; «Готов» — модель успешно создана и доступна для просмотра; «Ошибка» — возникла проблема при обработке, проверьте качество фотографий.",
        icon: <AlertCircle className="w-5 h-5" />,
    },
    {
        id: "public-gallery",
        question: "Как опубликовать работу в галерее?",
        answer: "Откройте страницу вашего артефакта со статусом «Готов», найдите переключатель «Публиковать в галерее» и активируйте его. Ваша работа появится в публичной галерее, где её смогут увидеть другие пользователи. Вы можете в любой момент снять публикацию.",
        icon: <FileText className="w-5 h-5" />,
    },
    {
        id: "login-issues",
        question: "Проблемы со входом в систему?",
        answer: "Убедитесь, что вы используете правильный email и пароль. Если забыли пароль, используйте функцию восстановления на странице входа. Проверьте, что ваш email подтверждён (письмо приходит при регистрации). Если проблема сохраняется, обратитесь в поддержку.",
        icon: <HelpCircle className="w-5 h-5" />,
    },
];

export default function DashHelp() {
    const [openFAQ, setOpenFAQ] = useState<string | null>(null);

    const toggleFAQ = (id: string) => {
        setOpenFAQ(openFAQ === id ? null : id);
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                    Центр помощи
                </p>
                <h1 className="text-4xl font-black text-textDark tracking-tight">
                    Вопросы и <span className="text-primary">поддержка</span>
                </h1>
                <p className="text-base text-secondary/80 max-w-2xl">
                    Найдите ответы на частые вопросы или свяжитесь с нашей
                    командой поддержки для получения дополнительной помощи.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                {/* FAQ Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-textDark">
                            Часто задаваемые вопросы
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {faqData.map((item) => {
                            const isOpen = openFAQ === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-white/60 bg-white/70 shadow-sm overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleFAQ(item.id)}
                                        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-backgroundLight/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                                {item.icon}
                                            </div>
                                            <span className="font-bold text-textDark text-base">
                                                {item.question}
                                            </span>
                                        </div>
                                        <div className="text-secondary shrink-0">
                                            {isOpen ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </div>
                                    </button>
                                    {isOpen && (
                                        <div className="px-5 pb-5 pt-0">
                                            <div className="pl-[52px] text-sm text-secondary leading-relaxed">
                                                {item.answer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Support & Resources Sidebar */}
                <div className="space-y-6">
                    {/* Contact Support */}
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-textDark">
                                    Написать в поддержку
                                </h3>
                                <p className="text-xs text-secondary/70">
                                    Мы ответим в течение 24 часов
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-secondary">
                            Не нашли ответ на свой вопрос? Наша команда всегда
                            готова помочь.
                        </p>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={() =>
                                (window.location.href =
                                    "mailto:support@example.com")
                            }
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            support@example.com
                        </Button>
                    </div>

                    {/* Quick Start Guide */}
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-textDark">
                                    Быстрый старт
                                </h3>
                                <p className="text-xs text-secondary/70">
                                    Гайд для новых пользователей
                                </p>
                            </div>
                        </div>
                        <ol className="text-sm text-secondary space-y-2 list-decimal list-inside">
                            <li>Создайте свой первый артефакт</li>
                            <li>Загрузите 20+ фотографий объекта</li>
                            <li>Дождитесь обработки (статус «Готов»)</li>
                            <li>Опубликуйте работу в галерее</li>
                        </ol>
                    </div>

                    {/* Documentation Link */}
                    <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-6 shadow-sm space-y-3">
                        <h3 className="text-base font-bold text-textDark">
                            Документация проекта
                        </h3>
                        <p className="text-sm text-secondary">
                            Полная техническая документация и руководства по
                            настройке доступны в README файле проекта.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            onClick={() => {
                                // In a real app, this could open the README in a modal or new tab
                                window.open(
                                    "https://github.com/yourusername/yourrepo#readme",
                                    "_blank"
                                );
                            }}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Открыть README
                        </Button>
                    </div>

                    {/* Tips Card */}
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-emerald-900 mb-3">
                            💡 Советы для лучшего результата
                        </h3>
                        <ul className="text-sm text-emerald-800/90 space-y-2">
                            <li>• Снимайте объект с разных ракурсов</li>
                            <li>• Используйте хорошее освещение</li>
                            <li>• Избегайте размытых фотографий</li>
                            <li>• Держите фон максимально чистым</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
