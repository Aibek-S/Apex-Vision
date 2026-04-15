import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/UI/button";
import { useAuth } from "../../contexts/useAuth";
import { supabase } from "../../lib/supabase";

const PHOTO_BUCKET = "findings-photos";

type FindingForm = {
    fullName: string;
    email: string;
    phone: string;
    city: string;
    region: string;
    objectType: string;
    objectDescription: string;
    lengthCm: string;
    widthCm: string;
    heightCm: string;
    weightKg: string;
    material: string;
    locationText: string;
    latitude: string;
    longitude: string;
    photoFile: File | null;
    consentInfo: boolean;
    consentTransfer: boolean;
    consentName: boolean;
    museumId: string;
};

type MuseumOption = {
    id: number;
    name: string;
};

const defaultForm: FindingForm = {
    fullName: "",
    email: "",
    phone: "",
    city: "",
    region: "",
    objectType: "",
    objectDescription: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    weightKg: "",
    material: "",
    locationText: "",
    latitude: "",
    longitude: "",
    photoFile: null,
    consentInfo: false,
    consentTransfer: false,
    consentName: false,
    museumId: "",
};

const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

const buildFileName = (file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const unique =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`;
    return `${unique}.${ext}`;
};

export default function DashRequest() {
    const navigate = useNavigate();
    const { user, isMuseumStaff, isGuest, profileLoading } = useAuth();
    const [form, setForm] = useState<FindingForm>(defaultForm);
    const [museums, setMuseums] = useState<MuseumOption[]>([]);
    const [museumsLoading, setMuseumsLoading] = useState(false);
    const [museumsError, setMuseumsError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(
        null,
    );

    const displayName = useMemo(() => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name;
        }
        if (user?.email) {
            return user.email.split("@")[0];
        }
        return "Пользователь";
    }, [user]);

    useEffect(() => {
        if (profileLoading) return;
        if (!user || isMuseumStaff || isGuest) {
            navigate("/dashboard/gallery", { replace: true });
        }
    }, [user, isMuseumStaff, isGuest, profileLoading, navigate]);

    useEffect(() => {
        if (!user) return;
        setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || user.user_metadata?.full_name || "",
            email: prev.email || user.email || "",
        }));
    }, [user]);

    useEffect(() => {
        let isMounted = true;
        const fetchMuseums = async () => {
            setMuseumsLoading(true);
            setMuseumsError(null);
            const { data, error } = await (supabase as any)
                .from("museums")
                .select("id,name")
                .order("name", { ascending: true });

            if (!isMounted) return;
            if (error) {
                setMuseumsError(error.message);
                setMuseums([]);
            } else {
                setMuseums((data ?? []) as MuseumOption[]);
            }
            setMuseumsLoading(false);
        };

        fetchMuseums();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const handleChange =
        (field: keyof FindingForm) => (value: string | boolean | File | null) =>
            setForm((prev) => ({ ...prev, [field]: value }));

    const handlePhotoChange = (file: File | null) => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }
        if (!file) {
            handleChange("photoFile")(null);
            setPhotoPreview(null);
            return;
        }
        handleChange("photoFile")(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const uploadPhoto = async () => {
        if (!form.photoFile) return null;
        const fileName = buildFileName(form.photoFile);
        const { error } = await supabase.storage
            .from(PHOTO_BUCKET)
            .upload(fileName, form.photoFile, {
                cacheControl: "3600",
                contentType: form.photoFile.type || "image/jpeg",
                upsert: false,
            });
        if (error) {
            const payload = error as {
                statusCode?: number;
                error?: string;
                message: string;
            };
            const code =
                typeof payload.statusCode === "number"
                    ? payload.statusCode
                    : "unknown";
            const details = payload.error ? ` ${payload.error}` : "";
            console.error("Storage upload error", {
                bucket: PHOTO_BUCKET,
                fileName,
                fileSize: form.photoFile.size,
                fileType: form.photoFile.type,
                error: payload,
            });
            throw new Error(
                `Ошибка загрузки (${code}): ${payload.message}${details}`,
            );
        }
        const { data } = supabase.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);
        setMessageType(null);

        if (!user) {
            setMessage("Сначала войдите в систему.");
            setMessageType("error");
            return;
        }

        if (!form.consentInfo || !form.consentTransfer || !form.consentName) {
            setMessage("Нужно подтвердить все согласия перед отправкой.");
            setMessageType("error");
            return;
        }

        const museumId = Number(form.museumId);
        if (!Number.isFinite(museumId) || museumId <= 0) {
            setMessage("Выберите музей.");
            setMessageType("error");
            return;
        }

        if (!form.fullName.trim() || !form.email.trim()) {
            setMessage("Укажите имя и email заявителя.");
            setMessageType("error");
            return;
        }

        if (!form.objectType.trim() || !form.locationText.trim()) {
            setMessage("Заполните тип находки и место обнаружения.");
            setMessageType("error");
            return;
        }

        setIsSubmitting(true);

        try {
            const photoUrl = await uploadPhoto();
            const payload = {
                full_name: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || null,
                city: form.city.trim() || null,
                region: form.region.trim() || null,
                object_type: form.objectType.trim(),
                object_description: form.objectDescription.trim() || null,
                length_cm: parseOptionalNumber(form.lengthCm),
                width_cm: parseOptionalNumber(form.widthCm),
                height_cm: parseOptionalNumber(form.heightCm),
                weight_kg: parseOptionalNumber(form.weightKg),
                material: form.material.trim() || null,
                location_text: form.locationText.trim(),
                latitude: parseOptionalNumber(form.latitude),
                longitude: parseOptionalNumber(form.longitude),
                photo_url: photoUrl,
                consent_info: form.consentInfo,
                consent_transfer: form.consentTransfer,
                consent_name: form.consentName,
                museum_id: museumId,
            };

            const { error } = await (supabase as any)
                .from("findings")
                .insert(payload);

            if (error) {
                throw new Error(error.message);
            }

            setMessage("Заявка отправлена. Спасибо за участие!");
            setMessageType("success");
            setForm((prev) => ({
                ...defaultForm,
                fullName: prev.fullName,
                email: prev.email,
            }));
            setPhotoPreview(null);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Не удалось отправить заявку.",
            );
            setMessageType("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <header className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                    Заявка на находку
                </p>
                <h1 className="text-4xl font-black text-textDark tracking-tight">
                    Отправить свой артефакт
                </h1>
                <p className="text-base text-secondary/80 max-w-2xl">
                    Заполните данные о находке. После отправки заявка попадет в
                    музей для проверки.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Заявитель
                            </p>
                            <h2 className="text-lg font-semibold text-textDark">
                                Контактные данные
                            </h2>
                        </div>
                        <span className="text-xs text-secondary/70">
                            {displayName}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                            label="ФИО"
                            required
                            value={form.fullName}
                            onChange={handleChange("fullName")}
                            placeholder="Например, Айдана Төлепова"
                        />
                        <Field
                            label="Email"
                            required
                            type="email"
                            value={form.email}
                            onChange={handleChange("email")}
                            placeholder="name@example.com"
                        />
                        <Field
                            label="Телефон"
                            value={form.phone}
                            onChange={handleChange("phone")}
                            placeholder="+7 700 000 00 00"
                        />
                        <Field
                            label="Город"
                            value={form.city}
                            onChange={handleChange("city")}
                            placeholder="Алматы"
                        />
                        <Field
                            label="Регион"
                            value={form.region}
                            onChange={handleChange("region")}
                            placeholder="Алматинская область"
                        />
                    </div>
                </section>

                <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Находка
                    </p>
                    <h2 className="text-lg font-semibold text-textDark">
                        Описание объекта
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                            label="Тип объекта"
                            required
                            value={form.objectType}
                            onChange={handleChange("objectType")}
                            placeholder="Например, керамика"
                        />
                        <Field
                            label="Материал"
                            value={form.material}
                            onChange={handleChange("material")}
                            placeholder="Камень, металл, глина"
                        />
                    </div>
                    <TextAreaField
                        label="Описание"
                        value={form.objectDescription}
                        onChange={handleChange("objectDescription")}
                        placeholder="Кратко опишите находку"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Field
                            label="Длина (см)"
                            value={form.lengthCm}
                            onChange={handleChange("lengthCm")}
                            placeholder="0"
                        />
                        <Field
                            label="Ширина (см)"
                            value={form.widthCm}
                            onChange={handleChange("widthCm")}
                            placeholder="0"
                        />
                        <Field
                            label="Высота (см)"
                            value={form.heightCm}
                            onChange={handleChange("heightCm")}
                            placeholder="0"
                        />
                        <Field
                            label="Вес (кг)"
                            value={form.weightKg}
                            onChange={handleChange("weightKg")}
                            placeholder="0"
                        />
                    </div>
                </section>

                <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Локация
                    </p>
                    <h2 className="text-lg font-semibold text-textDark">
                        Где была найдена находка
                    </h2>
                    <TextAreaField
                        label="Описание места"
                        required
                        value={form.locationText}
                        onChange={handleChange("locationText")}
                        placeholder="Опишите место, условия и ориентиры"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                            label="Широта"
                            value={form.latitude}
                            onChange={handleChange("latitude")}
                            placeholder="43.238949"
                        />
                        <Field
                            label="Долгота"
                            value={form.longitude}
                            onChange={handleChange("longitude")}
                            placeholder="76.889709"
                        />
                    </div>
                </section>

                <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Фото
                    </p>
                    <h2 className="text-lg font-semibold text-textDark">
                        Изображение находки
                    </h2>
                    <label className="space-y-1 text-sm text-secondary">
                        <span className="font-medium text-textDark">
                            Загрузите фото
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                                handlePhotoChange(
                                    event.target.files?.[0] ?? null,
                                )
                            }
                            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        />
                        <span className="text-xs text-secondary/70">
                            Фото не обязательно, но поможет музею оценить
                            находку.
                        </span>
                    </label>
                    {photoPreview && (
                        <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-secondary/60 mb-2">
                                Предпросмотр
                            </p>
                            <img
                                src={photoPreview}
                                alt="Фото находки"
                                className="w-full max-h-64 object-cover rounded-xl border border-black/10"
                            />
                        </div>
                    )}
                </section>

                <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Согласия
                    </p>
                    <h2 className="text-lg font-semibold text-textDark">
                        Подтверждения
                    </h2>
                    <Checkbox
                        checked={form.consentInfo}
                        onChange={(value) => handleChange("consentInfo")(value)}
                        label="Я подтверждаю достоверность информации"
                    />
                    <Checkbox
                        checked={form.consentTransfer}
                        onChange={(value) =>
                            handleChange("consentTransfer")(value)
                        }
                        label="Согласен передать находку музею для изучения"
                    />
                    <Checkbox
                        checked={form.consentName}
                        onChange={(value) => handleChange("consentName")(value)}
                        label="Разрешаю указывать мое имя в публикациях"
                    />
                </section>

                <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Музей
                    </p>
                    <h2 className="text-lg font-semibold text-textDark">
                        К какому музею отправить заявку
                    </h2>
                    <label className="space-y-1 text-sm text-secondary">
                        <span className="font-medium text-textDark">
                            Музей *
                        </span>
                        <select
                            value={form.museumId}
                            onChange={(event) =>
                                handleChange("museumId")(event.target.value)
                            }
                            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        >
                            <option value="">Выберите музей</option>
                            {museums.map((museum) => (
                                <option key={museum.id} value={museum.id}>
                                    {museum.name}
                                </option>
                            ))}
                        </select>
                        {museumsLoading && (
                            <span className="text-xs text-secondary/70">
                                Загрузка списка музеев...
                            </span>
                        )}
                        {museumsError && (
                            <span className="text-xs text-destructive">
                                {museumsError}
                            </span>
                        )}
                    </label>
                </section>

                <div className="flex flex-wrap items-center gap-4">
                    <Button
                        type="submit"
                        variant="primary"
                        loading={isSubmitting}
                    >
                        Отправить заявку
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/dashboard/home")}
                    >
                        Вернуться
                    </Button>
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
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
};

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    required,
}: FieldProps) {
    return (
        <label className="space-y-1 text-sm text-secondary">
            <span className="font-medium text-textDark">
                {label}
                {required ? " *" : ""}
            </span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
        </label>
    );
}

type TextAreaProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
};

function TextAreaField({
    label,
    value,
    onChange,
    placeholder,
    required,
}: TextAreaProps) {
    return (
        <label className="space-y-1 text-sm text-secondary">
            <span className="font-medium text-textDark">
                {label}
                {required ? " *" : ""}
            </span>
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

type CheckboxProps = {
    checked: boolean;
    label: string;
    onChange: (value: boolean) => void;
};

function Checkbox({ checked, label, onChange }: CheckboxProps) {
    return (
        <label className="flex items-start gap-3 text-sm text-secondary">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-black/20 text-primary focus:ring-primary/30"
            />
            <span>{label}</span>
        </label>
    );
}
