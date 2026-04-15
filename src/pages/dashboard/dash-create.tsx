import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/UI/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/useAuth";
import { uploadArtifactImage } from "../../services/storageService";

type MeasurementForm = {
    name: string;
    cipherId: string;
    dating: string;
    placeOfCreation: string;
    publisherName: string;
    length: string;
    width: string;
    height: string;
    weight: string;
    material: string;
    technique: string;
    cost: string;
    quantity: string;
    subject: string;
    legend: string;
    bibliography: string;
    reportAuthor: string;
    conditionDescription: string;
    restorationDetails: string;
};

const defaultForm: MeasurementForm = {
    name: "",
    cipherId: "",
    dating: "",
    placeOfCreation: "",
    publisherName: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    material: "",
    technique: "",
    cost: "",
    quantity: "",
    subject: "",
    legend: "",
    bibliography: "",
    reportAuthor: "",
    conditionDescription: "",
    restorationDetails: "",
};

const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

export default function DashCreate() {
    const navigate = useNavigate();
    const { user, isMuseumStaff, isGuest, profileLoading } = useAuth();

    const [form, setForm] = useState<MeasurementForm>(defaultForm);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(
        null,
    );

    useEffect(() => {
        if (profileLoading) return;
        if (!isMuseumStaff || isGuest) {
            navigate("/dashboard/gallery", { replace: true });
        }
    }, [isMuseumStaff, isGuest, profileLoading, navigate]);

    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const handleChange = (field: keyof MeasurementForm) => (value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleCancel = () => navigate(-1);

    const handlePhotoSelect = (file: File | null) => {
        setPhotoError(null);
        setPhotoFile(file);

        setPhotoPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return file ? URL.createObjectURL(file) : null;
        });
    };

    const hasMeasurementValues = useMemo(() => {
        const measurementValues = {
            cipherId: form.cipherId,
            dating: form.dating,
            placeOfCreation: form.placeOfCreation,
            publisherName: form.publisherName,
            length: form.length,
            width: form.width,
            height: form.height,
            weight: form.weight,
            material: form.material,
            technique: form.technique,
            cost: form.cost,
            quantity: form.quantity,
            subject: form.subject,
            legend: form.legend,
            bibliography: form.bibliography,
            reportAuthor: form.reportAuthor,
            conditionDescription: form.conditionDescription,
            restorationDetails: form.restorationDetails,
        };

        return Object.values(measurementValues).some(
            (value) => value.trim().length > 0,
        );
    }, [form]);

    const isPaperFilled = useMemo(
        () => Object.values(form).some((value) => value.trim().length > 0),
        [form],
    );

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);
        setMessageType(null);
        setPhotoError(null);

        if (!user) {
            setMessage("Сначала войдите в систему, чтобы создать проект.");
            setMessageType("error");
            return;
        }

        setLoading(true);

        try {
            const artifactName = form.name.trim() || "Без названия";
            const { data: artifact, error: artifactError } = await supabase
                .from("artifacts")
                .insert({
                    name: artifactName,
                    status: "created",
                    user_id: user.id,
                    thumbnail_url: null,
                })
                .select("id")
                .single();

            if (artifactError) {
                throw new Error(artifactError.message);
            }

            const artifactId = artifact.id;

            if (photoFile) {
                const uploadResult = await uploadArtifactImage({
                    file: photoFile,
                    artifactId,
                    sessionId: "report",
                });

                const { error: thumbnailError } = await supabase
                    .from("artifacts")
                    .update({ thumbnail_url: uploadResult.storagePath })
                    .eq("id", artifactId);

                if (thumbnailError) {
                    throw new Error(thumbnailError.message);
                }
            }

            if (hasMeasurementValues) {
                const measurementPayload = {
                    artifact_id: artifactId,
                    cipher_id: form.cipherId.trim() || null,
                    dating: form.dating.trim() || null,
                    place_of_creation: form.placeOfCreation.trim() || null,
                    publisher_name: form.publisherName.trim() || null,
                    length: parseOptionalNumber(form.length),
                    width: parseOptionalNumber(form.width),
                    height: parseOptionalNumber(form.height),
                    weight: parseOptionalNumber(form.weight),
                    material: form.material.trim() || null,
                    technique: form.technique.trim() || null,
                    cost: parseOptionalNumber(form.cost),
                    quantity: parseOptionalNumber(form.quantity),
                    subject: form.subject.trim() || null,
                    legend: form.legend.trim() || null,
                    bibliography: form.bibliography.trim() || null,
                    report_author: form.reportAuthor.trim() || null,
                    condition_description:
                        form.conditionDescription.trim() || null,
                    restoration_details: form.restorationDetails.trim() || null,
                };

                const { error: measurementError } = await supabase
                    .from("artifact_measurements")
                    .insert(measurementPayload);

                if (measurementError) {
                    throw new Error(measurementError.message);
                }
            }

            navigate(`/dashboard/projects/${artifactId}`);
        } catch (error) {
            const text =
                error instanceof Error
                    ? error.message
                    : "Не удалось создать проект.";
            setMessage(text);
            setMessageType("error");
            if (photoFile) {
                setPhotoError(text);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<ArrowLeft className="w-4 h-4" />}
                    onClick={handleCancel}
                >
                    Назад
                </Button>
            </div>

            <header className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/70">
                    Создание проекта
                </p>
                <h1 className="text-3xl font-bold text-textDark">
                    Новая карточка археологического артефакта
                </h1>
                <p className="text-sm text-secondary/80 max-w-2xl">
                    Заполните только те поля, которые есть сейчас. Все можно
                    отредактировать позже.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        <section className="flex-1 space-y-4">
                            <h2 className="text-lg font-semibold text-textDark">
                                Общие данные
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field
                                    label="Шифр / инвентарный номер"
                                    placeholder="Например, МА-001"
                                    value={form.cipherId}
                                    onChange={handleChange("cipherId")}
                                />
                                <Field
                                    label="Название предмета"
                                    placeholder="Например, бронзовый наконечник"
                                    value={form.name}
                                    onChange={handleChange("name")}
                                />
                                <Field
                                    label="Датировка"
                                    placeholder="Например, IV век до н.э."
                                    value={form.dating}
                                    onChange={handleChange("dating")}
                                />
                                <Field
                                    label="Место изготовления"
                                    placeholder="Например, Северный Казахстан"
                                    value={form.placeOfCreation}
                                    onChange={handleChange("placeOfCreation")}
                                />
                                <Field
                                    label="Шебер / издатель"
                                    placeholder="Имя мастера или автора"
                                    value={form.publisherName}
                                    onChange={handleChange("publisherName")}
                                />
                                <label className="space-y-1 text-sm text-secondary">
                                    <span className="font-medium text-textDark">
                                        Фото артефакта
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) =>
                                            handlePhotoSelect(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    />
                                    {photoError && (
                                        <span className="text-xs text-destructive">
                                            {photoError}
                                        </span>
                                    )}
                                </label>
                            </div>

                            {photoPreview && (
                                <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-secondary/60 mb-2">
                                        Предпросмотр
                                    </p>
                                    <img
                                        src={photoPreview}
                                        alt="Предпросмотр артефакта"
                                        className="w-full max-h-64 object-cover rounded-xl border border-black/10"
                                    />
                                </div>
                            )}
                        </section>

                        <section className="w-full lg:w-80 space-y-4 rounded-2xl border border-black/10 bg-white/70 p-4">
                            <h3 className="text-sm font-semibold text-textDark uppercase tracking-[0.2em]">
                                Размеры и вес
                            </h3>
                            <div className="space-y-3">
                                <Field
                                    label="Длина (мм)"
                                    placeholder="0"
                                    value={form.length}
                                    onChange={handleChange("length")}
                                />
                                <Field
                                    label="Ширина (мм)"
                                    placeholder="0"
                                    value={form.width}
                                    onChange={handleChange("width")}
                                />
                                <Field
                                    label="Высота (мм)"
                                    placeholder="0"
                                    value={form.height}
                                    onChange={handleChange("height")}
                                />
                                <Field
                                    label="Вес (г)"
                                    placeholder="0"
                                    value={form.weight}
                                    onChange={handleChange("weight")}
                                />
                            </div>
                        </section>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-textDark">
                            Материалы и техника
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field
                                label="Материал"
                                placeholder="Например, бронза, камень"
                                value={form.material}
                                onChange={handleChange("material")}
                            />
                            <Field
                                label="Техника"
                                placeholder="Например, литье, резьба"
                                value={form.technique}
                                onChange={handleChange("technique")}
                            />
                            <Field
                                label="Бағасы / стоимость"
                                placeholder="0"
                                value={form.cost}
                                onChange={handleChange("cost")}
                            />
                            <Field
                                label="Саны / количество"
                                placeholder="1"
                                value={form.quantity}
                                onChange={handleChange("quantity")}
                            />
                            <Field
                                label="Тақырыбы / тема"
                                placeholder="Например, культовый объект"
                                value={form.subject}
                                onChange={handleChange("subject")}
                            />
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-textDark">
                            Состояние и реставрация
                        </h2>
                        <TextAreaField
                            label="Состояние"
                            placeholder="Описание состояния находки"
                            value={form.conditionDescription}
                            onChange={handleChange("conditionDescription")}
                        />
                        <TextAreaField
                            label="Реставрация"
                            placeholder="Детали реставрации, если есть"
                            value={form.restorationDetails}
                            onChange={handleChange("restorationDetails")}
                        />
                    </section>
                </div>

                <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-textDark">
                        Текстовые поля отчета
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <TextAreaField
                            label="Аңыз / легенда"
                            placeholder="Легенда и интерпретация"
                            value={form.legend}
                            onChange={handleChange("legend")}
                        />
                        <TextAreaField
                            label="Библиография"
                            placeholder="Источники, публикации, архивы"
                            value={form.bibliography}
                            onChange={handleChange("bibliography")}
                        />
                        <TextAreaField
                            label="Автор отчета"
                            placeholder="ФИО составителя"
                            value={form.reportAuthor}
                            onChange={handleChange("reportAuthor")}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-secondary/70">
                        {isPaperFilled
                            ? "Поля заполнены. Нажмите сохранить, чтобы создать проект."
                            : "Заполните любые поля и сохраните карточку проекта."}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" variant="primary" loading={loading}>
                            Сохранить проект
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Отмена
                        </Button>
                    </div>
                </div>

                {message && (
                    <p
                        className={`text-sm leading-relaxed ${
                            messageType === "success"
                                ? "text-emerald-600"
                                : "text-destructive"
                        }`}
                    >
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}

type FieldProps = {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
};

function Field({ label, placeholder, value, onChange }: FieldProps) {
    return (
        <label className="space-y-1 text-sm text-secondary">
            <span className="font-medium text-textDark">{label}</span>
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
        </label>
    );
}

function TextAreaField({ label, placeholder, value, onChange }: FieldProps) {
    return (
        <label className="space-y-1 text-sm text-secondary">
            <span className="font-medium text-textDark">{label}</span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
        </label>
    );
}
