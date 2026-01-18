import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useChat } from "ai/react";
import { MessageCircle, X, Send, Library, Loader2 } from "lucide-react";

const CHAT_API_URL =
    import.meta.env.VITE_CHAT_API_URL || "http://localhost:3001/api/chat";

export default function ArchaeologistChat() {
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const { id: projectId } = useParams<{ id: string }>();

    const {
        messages,
        input,
        setInput,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
    } = useChat({
        api: CHAT_API_URL,
    });

    const handleInsertProjectId = () => {
        if (!projectId) return;
        const trimmed = input.trim();
        const prefix = trimmed ? `${input}\n` : "";
        setInput(`${prefix}current_project: ${projectId}`);
    };

    useEffect(() => {
        if (!scrollRef.current || !isOpen) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isLoading, isOpen]);

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
            {/* Окно чата */}
            {isOpen ? (
                <div className="flex h-[500px] w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 sm:w-[400px]">
                    {/* Хедер */}
                    <div className="flex items-center justify-between bg-amber-500 px-4 py-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Library size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold leading-none">
                                    Археолог
                                </p>
                                <p className="mt-1 text-[11px] opacity-90">
                                    Эксперт по артефактам
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-full p-1.5 transition hover:bg-white/20"
                            aria-label="Закрыть чат"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Сообщения */}
                    <div
                        ref={scrollRef}
                        className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 scrollbar-thin scrollbar-thumb-slate-200"
                    >
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-3 rounded-full bg-amber-100 p-3 text-amber-600">
                                    <Library size={24} />
                                </div>
                                <p className="max-w-[200px] text-xs font-medium text-slate-500">
                                    Здравствуйте! Я помогу вам с атрибуцией
                                    предметов. Спросите меня о конкретном
                                    артефакте.
                                </p>
                            </div>
                        ) : null}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${
                                    message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >
                                <div
                                    className={`relative max-w-[85%] break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                        message.role === "user"
                                            ? "bg-amber-500 text-white rounded-tr-none"
                                            : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">
                                        {message.content}
                                    </p>
                                    <span
                                        className={`text-[9px] mt-1 block opacity-70 ${
                                            message.role === "user"
                                                ? "text-right"
                                                : "text-left"
                                        }`}
                                    >
                                        {message.role === "user"
                                            ? "Вы"
                                            : "Бот-эксперт"}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-100 px-4 py-2.5 shadow-sm">
                                    <Loader2
                                        size={14}
                                        className="animate-spin text-amber-500"
                                    />
                                    <span className="text-xs text-slate-400 font-medium">
                                        Археолог изучает данные...
                                    </span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl bg-red-50 p-3 text-center text-xs text-red-600 border border-red-100">
                                <p className="font-semibold">
                                    Произошла ошибка
                                </p>
                                <p className="mt-1 opacity-80">
                                    {error.message}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Инпут */}
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!input.trim() || isLoading) return;
                            handleSubmit(event);
                        }}
                        className="border-t border-slate-100 bg-white p-4"
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-400">
                                {projectId
                                    ? `Текущий проект: ${projectId}`
                                    : "Проект не выбран"}
                            </span>
                            <button
                                type="button"
                                onClick={handleInsertProjectId}
                                disabled={!projectId || isLoading}
                                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title={
                                    projectId
                                        ? "Вставить current_project"
                                        : "Откройте страницу проекта"
                                }
                            >
                                current_project
                            </button>
                        </div>
                        <div className="relative flex items-center gap-2">
                            <input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Задайте вопрос по артефакту..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-700 transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white transition-all hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            {/* Кнопка открытия */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`group flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                    isOpen ? "bg-slate-800 rotate-90" : "bg-amber-500"
                }`}
                aria-label={isOpen ? "Закрыть чат" : "Открыть чат Археолога"}
            >
                {isOpen ? (
                    <X size={28} />
                ) : (
                    <MessageCircle
                        size={28}
                        className="group-hover:animate-pulse"
                    />
                )}
            </button>
        </div>
    );
}
