import { Button } from "../components/UI/button";
import Header from "../components/layouts/header";
import { Plus, ArrowRight, Settings, Trash2, Heart } from "lucide-react";

export default function Home() {
    return (
        <>
            <Header />

            <div className="min-h-screen bg-background p-10 text-textDark">
                <div className="mx-auto max-w-5xl space-y-14">
                    {/* Variants */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-secondary">
                            Варианты
                        </h2>
                        <div className="flex flex-wrap gap-4">
                            <Button>Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="link">Link</Button>
                        </div>
                    </section>

                    {/* Sizes */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-secondary">
                            Размеры
                        </h2>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button size="sm">Small</Button>
                            <Button size="md">Medium</Button>
                            <Button size="lg">Large</Button>
                        </div>
                    </section>

                    {/* Buttons with icons */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-secondary">
                            С иконками
                        </h2>
                        <div className="flex flex-wrap gap-4">
                            <Button iconLeft={<Plus />}>Добавить</Button>
                            <Button iconRight={<ArrowRight />}>Далее</Button>
                            <Button variant="secondary" iconLeft={<Heart />}>
                                Нравится
                            </Button>
                        </div>
                    </section>

                    {/* Icon only */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-secondary">
                            Только иконка
                        </h2>
                        <div className="flex gap-4">
                            <Button variant="icon" icon={<Settings />} />
                            <Button variant="icon" icon={<Heart />} />
                            <Button variant="icon" icon={<Trash2 />} />
                        </div>
                    </section>

                    {/* States */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-secondary">
                            Состояния
                        </h2>
                        <div className="flex flex-wrap gap-4">
                            <Button disabled>Disabled</Button>
                            <Button loading>Loading</Button>
                            <Button variant="destructive" iconLeft={<Trash2 />}>
                                Удалить
                            </Button>
                        </div>
                    </section>

                    {/* Full width */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-secondary">
                            На всю ширину
                        </h2>
                        <Button fullWidth size="lg">
                            Продолжить
                        </Button>
                    </section>
                </div>
            </div>
        </>
    );
}
