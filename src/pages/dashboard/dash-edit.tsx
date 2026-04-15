import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/UI/button";
import ModelViewer, {
    type ModelViewerHandle,
} from "../../components/canvas/ModelViewer";
import ObjModelViewer, {
    type ObjModelViewerHandle,
} from "../../components/canvas/ObjModelViewer";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/useAuth";
import { uploadArtifactImage } from "../../services/storageService";

const PHOTO_BUCKET = "artifacts-images";
const GEMINI_API_KEY = "***REDACTED***";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const AI_CLASSIFY_PROMPT = `
Ты эксперт по археологическим артефактам.
Проанализируй переданные изображения артефакта.
Верни строго JSON-объект без markdown, без пояснений и без лишних полей.
Формат ответа:
{
  "dating": string | null,
  "place_of_creation": string | null,
  "material": string | null,
  "technique": string | null,
  "quantity": number | null,
  "subject": string | null,
  "legend": string | null,
  "bibliography": string | null,
  "report_author": string | null,
  "condition_description": string | null,
  "restoration_details": string | null
}
Если значение неизвестно, верни null.
`.trim();

type MeasurementForm = {
    name: string;
    photoUrl: string;
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
    photoUrl: "",
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

type AiMeasurement = {
    dating: string | null;
    place_of_creation: string | null;
    material: string | null;
    technique: string | null;
    quantity: number | null;
    subject: string | null;
    legend: string | null;
    bibliography: string | null;
    report_author: string | null;
    condition_description: string | null;
    restoration_details: string | null;
};

const EMPTY_AI_MEASUREMENT: AiMeasurement = {
    dating: null,
    place_of_creation: null,
    material: null,
    technique: null,
    quantity: null,
    subject: null,
    legend: null,
    bibliography: null,
    report_author: null,
    condition_description: null,
    restoration_details: null,
};

const toNumberValue = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const normalized = String(value).replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatDetailValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") return String(value);
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
};

const inferModelTypeFromUrl = (url: string | null) => {
    if (!url) return null;
    try {
        const parsed = new URL(url, window.location.origin);
        const name = parsed.pathname.split("/").pop() || "";
        const ext = name.split(".").pop();
        return ext ? ext.toLowerCase() : null;
    } catch {
        return null;
    }
};

const buildMtlUrl = (url: string | null) =>
    url ? url.replace(/\.obj$/i, ".mtl") : null;

const getFileNameFromSource = (source: string, fallback = "artifact-photo.jpg") => {
    const value = source.trim();
    if (!value) return fallback;
    const cleaned = value.split("?")[0].split("#")[0];
    const parts = cleaned.split("/");
    const candidate = parts[parts.length - 1];
    return candidate && candidate.trim() ? candidate : fallback;
};

const toBase64 = (bytes: Uint8Array) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
};

const fileToInlineData = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return {
        mimeType: file.type || "image/jpeg",
        data: toBase64(bytes),
    };
};

const parseJsonFromModelText = (text: string) => {
    const trimmed = text.trim();
    const withoutFence = trimmed
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "");
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start < 0 || end < 0 || end <= start) {
        throw new Error("Модель вернула ответ не в формате JSON.");
    }
    return JSON.parse(withoutFence.slice(start, end + 1)) as Record<
        string,
        unknown
    >;
};

export default function DashEdit() {
    const navigate = useNavigate();
    const { id: projectId } = useParams<{ id: string }>();
    const { user, isMuseumStaff, isGuest, profileLoading } = useAuth();
    const [form, setForm] = useState<MeasurementForm>(defaultForm);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveReady, setAutoSaveReady] = useState(false);
    const [artifactId, setArtifactId] = useState<string | null>(null);
    const [measurementId, setMeasurementId] = useState<number | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(
        null,
    );
    const [autoSaveMessage, setAutoSaveMessage] = useState<string | null>(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const modelViewerRef = useRef<ModelViewerHandle | null>(null);
    const objViewerRef = useRef<ObjModelViewerHandle | null>(null);
    const [storedModelUrl, setStoredModelUrl] = useState<string | null>(null);
    const [modelError, setModelError] = useState<string | null>(null);

    const previewModelUrl = storedModelUrl;
    const previewModelType = inferModelTypeFromUrl(storedModelUrl);
    const previewMaterialUrl =
        previewModelType === "obj" ? buildMtlUrl(storedModelUrl) : null;
    const [modelReady, setModelReady] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPreparing, setAiPreparing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiSuggestions, setAiSuggestions] =
        useState<Partial<AiMeasurement> | null>(null);
    const [aiApplied, setAiApplied] = useState<
        Partial<Record<keyof AiMeasurement, boolean>>
    >({});
    const [aiBaseline, setAiBaseline] =
        useState<AiMeasurement>(EMPTY_AI_MEASUREMENT);
    const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
    const [aiPreviewFiles, setAiPreviewFiles] = useState<File[]>([]);
    const [aiPreviewUrls, setAiPreviewUrls] = useState<string[]>([]);

    const isEditMode = Boolean(projectId);
    const isPaperFilled = useMemo(
        () => Object.values(form).some((value) => value.trim().length > 0),
        [form],
    );

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

    useEffect(() => {
        if (profileLoading) return;
        if (!isMuseumStaff || isGuest) {
            navigate("/dashboard/gallery", { replace: true });
        }
    }, [isMuseumStaff, isGuest, profileLoading, navigate]);

    useEffect(() => {
        setStoredModelUrl(null);
        setModelError(null);
    }, [projectId]);

    useEffect(() => {
        if (projectId) return;
        navigate("/dashboard/create", { replace: true });
    }, [projectId, navigate]);

    useEffect(() => {
        return () => {
            aiPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [aiPreviewUrls]);

    const handleChange = (field: keyof MeasurementForm) => (value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleCancel = () => navigate(-1);

    const getAiBaseline = (): AiMeasurement => ({
        dating: form.dating.trim() || null,
        place_of_creation: form.placeOfCreation.trim() || null,
        material: form.material.trim() || null,
        technique: form.technique.trim() || null,
        quantity: parseOptionalNumber(form.quantity),
        subject: form.subject.trim() || null,
        legend: form.legend.trim() || null,
        bibliography: form.bibliography.trim() || null,
        report_author: form.reportAuthor.trim() || null,
        condition_description: form.conditionDescription.trim() || null,
        restoration_details: form.restorationDetails.trim() || null,
    });

    const applyAiField = (
        field: keyof AiMeasurement,
        value: AiMeasurement[keyof AiMeasurement] | undefined,
    ) => {
        setForm((prev) => {
            switch (field) {
                case "dating":
                    return { ...prev, dating: value ? String(value) : "" };
                case "place_of_creation":
                    return {
                        ...prev,
                        placeOfCreation: value ? String(value) : "",
                    };
                case "material":
                    return { ...prev, material: value ? String(value) : "" };
                case "technique":
                    return { ...prev, technique: value ? String(value) : "" };
                case "quantity":
                    return {
                        ...prev,
                        quantity:
                            value !== null && value !== undefined
                                ? String(value)
                                : "",
                    };
                case "subject":
                    return { ...prev, subject: value ? String(value) : "" };
                case "legend":
                    return { ...prev, legend: value ? String(value) : "" };
                case "bibliography":
                    return {
                        ...prev,
                        bibliography: value ? String(value) : "",
                    };
                case "report_author":
                    return {
                        ...prev,
                        reportAuthor: value ? String(value) : "",
                    };
                case "condition_description":
                    return {
                        ...prev,
                        conditionDescription: value ? String(value) : "",
                    };
                case "restoration_details":
                    return {
                        ...prev,
                        restorationDetails: value ? String(value) : "",
                    };
                default:
                    return prev;
            }
        });
    };

    const resolvePreviewUrl = async (value: string | null) => {
        if (!value) return null;
        if (value.startsWith("http")) return value;
        const storagePath = value.startsWith(`${PHOTO_BUCKET}/`)
            ? value.slice(PHOTO_BUCKET.length + 1)
            : value;
        const { data, error } = await supabase.storage
            .from(PHOTO_BUCKET)
            .createSignedUrl(storagePath, 60 * 60);
        if (error) {
            throw new Error(error.message);
        }
        return data.signedUrl;
    };


    const isLocalModelUrl = (url: string) =>
        url.startsWith("/@fs/") || /^[a-zA-Z]:\\/.test(url);

    const toFsUrl = (url: string) =>
        url.startsWith("/@fs/")
            ? url
            : `/@fs/${url.replace(/\\/g, "/")}`;

    const validateStoredModelUrl = async (url: string) => {
        if (!isLocalModelUrl(url)) {
            return {
                resolvedUrl: null,
                error:
                    "3D-модель должна храниться локально в папке Local_Storage.",
            };
        }
        try {
            const response = await fetch(toFsUrl(url), { cache: "no-store" });
            if (!response.ok) {
                throw new Error(
                    "Не удалось загрузить 3D-модель по ссылке из базы данных.",
                );
            }
            return {
                resolvedUrl: response.url || toFsUrl(url),
                error: null,
            };
        } catch (error) {
            return {
                resolvedUrl: null,
                error:
                    error instanceof Error
                        ? error.message
                        : "Не удалось загрузить 3D-модель по ссылке из базы данных.",
            };
        }
    };

    const ensureArtifact = async () => {
        if (!user) {
            throw new Error(
                "Сначала войдите в систему, чтобы сохранить артефакт.",
            );
        }

        if (artifactId) return artifactId;
        if (projectId) return projectId;

        throw new Error("Для редактирования нужен идентификатор проекта.");
    };

    const saveArtifact = async (id: string) => {
        const artifactName = form.name.trim() || "Без названия";
        const { error } = await supabase
            .from("artifacts")
            .update({
                name: artifactName,
                thumbnail_url: form.photoUrl.trim() || null,
            })
            .eq("id", id);

        if (error) {
            throw new Error(error.message);
        }
    };

    const saveMeasurement = async (id: string) => {
        if (!hasMeasurementValues) return;

        const measurementPayload = {
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
            condition_description: form.conditionDescription.trim() || null,
            restoration_details: form.restorationDetails.trim() || null,
        };

        if (measurementId) {
            const { error } = await supabase
                .from("artifact_measurements")
                .update(measurementPayload)
                .eq("id", measurementId);

            if (error) throw new Error(error.message);
            return;
        }

        const { data: updatedRows, error: updateError } = await supabase
            .from("artifact_measurements")
            .update(measurementPayload)
            .eq("artifact_id", id)
            .select("id");

        if (updateError) {
            throw new Error(updateError.message);
        }

        if (updatedRows && updatedRows.length > 0) {
            setMeasurementId(updatedRows[0].id);
            return;
        }

        const { data, error } = await supabase
            .from("artifact_measurements")
            .insert({
                artifact_id: id,
                ...measurementPayload,
            })
            .select("id")
            .single();

        if (error) {
            throw new Error(error.message);
        }

        setMeasurementId(data.id);
    };

    const handlePhotoUpload = async (file: File | null) => {
        if (!file) return;
        setPhotoError(null);
        setPhotoUploading(true);

        try {
            const id = await ensureArtifact();
            const uploadResult = await uploadArtifactImage({
                file,
                artifactId: id,
                sessionId: "report",
            });
            const signedUrl = await resolvePreviewUrl(uploadResult.storagePath);
            setForm((prev) => ({
                ...prev,
                photoUrl: uploadResult.storagePath,
            }));
            setPhotoPreview(signedUrl);
            const { error } = await supabase
                .from("artifacts")
                .update({
                    name: form.name.trim() || "Без названия",
                    thumbnail_url: uploadResult.storagePath,
                })
                .eq("id", id);
            if (error) {
                throw new Error(error.message);
            }
            setAutoSaveMessage("Фото загружено и сохранено.");
        } catch (error) {
            setPhotoError(
                error instanceof Error
                    ? error.message
                    : "Ошибка загрузки фото.",
            );
        } finally {
            setPhotoUploading(false);
        }
    };

    const captureAiScreenshots = async () => {
        const captureAngles: Array<[number, number, number]> = [
            [0, 0, 0],
            [0, Math.PI / 2, 0],
            [0, Math.PI, 0],
            [0, -Math.PI / 2, 0],
            [Math.PI / 2, 0, 0],
            [-Math.PI / 2, 0, 0],
        ];

        if (!previewModelUrl) {
            throw new Error("Сначала загрузите 3D-модель.");
        }

        const viewer =
            previewModelType === "obj"
                ? objViewerRef.current
                : modelViewerRef.current;

        if (!viewer) {
            throw new Error("3D-вьюер не готов к скриншотам.");
        }

        const screenshots = await viewer.captureScreenshots(captureAngles);
        if (!screenshots.length) {
            throw new Error("Не удалось получить скриншоты модели.");
        }

        return screenshots;
    };

    const captureAiScreenshots2d = async () => {
        const source = form.photoUrl.trim();
        const previewUrl = photoPreview ?? (await resolvePreviewUrl(source || null));

        if (!previewUrl) {
            throw new Error("Сначала загрузите фото артефакта.");
        }

        const response = await fetch(previewUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Не удалось получить фото для AI-классификации.");
        }

        const blob = await response.blob();
        const fileName = getFileNameFromSource(source || previewUrl);
        const imageFile = new File([blob], fileName, {
            type: blob.type || "image/jpeg",
        });

        return [imageFile];
    };

    const prepareAiPreview = async (
        getFiles: () => Promise<File[]>,
        fallbackError: string,
    ) => {
        if (!isEditMode) {
            setAiError("Сначала сохраните карточку артефакта.");
            return;
        }

        setAiPreparing(true);
        setAiError(null);
        setAiSuggestions(null);
        setAiApplied({});
        setAiPreviewOpen(false);
        setAiPreviewFiles([]);
        setAiPreviewUrls([]);

        try {
            const screenshots = await getFiles();
            const urls = screenshots.map((file) => URL.createObjectURL(file));
            setAiPreviewFiles(screenshots);
            setAiPreviewUrls(urls);
            setAiPreviewOpen(true);
        } catch (error) {
            setAiError(
                error instanceof Error
                    ? error.message
                    : fallbackError,
            );
        } finally {
            setAiPreparing(false);
        }
    };

    const handleAiClassify = async () =>
        prepareAiPreview(
            captureAiScreenshots,
            "Не удалось создать скриншоты 3D-модели.",
        );

    const handleAiClassify2d = async () =>
        prepareAiPreview(
            captureAiScreenshots2d,
            "Не удалось подготовить фото артефакта.",
        );

    const handleAiConfirm = async () => {
        if (!aiPreviewFiles.length) {
            setAiError("Скриншоты не найдены, попробуйте еще раз.");
            return;
        }

        setAiLoading(true);
        setAiError(null);
        setAiSuggestions(null);
        setAiApplied({});
        setAiBaseline(getAiBaseline());

        try {
            const imageParts = await Promise.all(
                aiPreviewFiles.map(async (file) => ({
                    inlineData: await fileToInlineData(file),
                })),
            );
            const response = await fetch(GEMINI_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json",
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: AI_CLASSIFY_PROMPT }, ...imageParts],
                        },
                    ],
                }),
            });

            if (!response.ok) {
                throw new Error("Ошибка при обращении к Gemini API.");
            }

            const payload = (await response.json()) as {
                candidates?: Array<{
                    content?: {
                        parts?: Array<{
                            text?: string;
                        }>;
                    };
                }>;
            };

            const modelText =
                payload.candidates?.[0]?.content?.parts
                    ?.map((part) => part.text ?? "")
                    .join("")
                    .trim() ?? "";

            if (!modelText) {
                throw new Error("Gemini не вернул данные классификации.");
            }

            const responseJson = parseJsonFromModelText(modelText);
            const getAiValue = (key: string) => responseJson[key] ?? null;

            const suggestions: Partial<AiMeasurement> = {
                dating: getAiValue("dating") as string | null,
                place_of_creation: getAiValue("place_of_creation") as
                    | string
                    | null,
                material: getAiValue("material") as string | null,
                technique: getAiValue("technique") as string | null,
                quantity: toNumberValue(getAiValue("quantity")),
                subject: getAiValue("subject") as string | null,
                legend: getAiValue("legend") as string | null,
                bibliography: getAiValue("bibliography") as string | null,
                report_author: (getAiValue("report_author") || "APEX-AI") as
                    | string
                    | null,
                condition_description: getAiValue("condition_description") as
                    | string
                    | null,
                restoration_details: getAiValue("restoration_details") as
                    | string
                    | null,
            };

            setAiSuggestions(suggestions);
        } catch (error) {
            setAiError(
                error instanceof Error
                    ? error.message
                    : "Не удалось получить данные Gemini.",
            );
        } finally {
            setAiLoading(false);
        }
    };

    const handleAiPreviewClose = () => {
        setAiPreviewOpen(false);
        setAiPreviewFiles([]);
        setAiPreviewUrls([]);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);
        setMessageType(null);

        if (!user) {
            setMessage("Сначала войдите в систему, чтобы сохранить артефакт.");
            setMessageType("error");
            return;
        }

        setLoading(true);

        try {
            const id = await ensureArtifact();
            await saveArtifact(id);
            await saveMeasurement(id);
            setMessage("Карточка артефакта сохранена.");
            setMessageType("success");
            navigate(`/dashboard/projects/${id}`);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "Ошибка сохранения.",
            );
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (!projectId) {
                setAutoSaveReady(true);
                return;
            }

            const { data: artifact, error: artifactError } = await supabase
                .from("artifacts")
                .select('id,name,thumbnail_url,"3d_url"')
                .eq("id", projectId)
                .single();

            if (!isMounted) return;

            if (artifactError) {
                setMessage(artifactError.message);
                setMessageType("error");
                setAutoSaveReady(true);
                return;
            }

            setArtifactId(artifact.id);
            setForm((prev) => ({
                ...prev,
                name: artifact.name ?? "",
                photoUrl: artifact.thumbnail_url ?? "",
            }));
            if (artifact["3d_url"]) {
                const storedUrl = artifact["3d_url"];
                setModelError(null);
                if (!isLocalModelUrl(storedUrl)) {
                    setStoredModelUrl(null);
                    setModelError(
                        "3D-модель должна храниться локально. Загрузите файлы в Local_Storage.",
                    );
                } else {
                    setStoredModelUrl(toFsUrl(storedUrl));
                }
                setModelReady(false);
                void validateStoredModelUrl(storedUrl).then((result) => {
                    if (!isMounted) return;
                    if (result.error) {
                        setModelError(result.error);
                        return;
                    }
                    if (result.resolvedUrl && result.resolvedUrl !== storedUrl) {
                        setStoredModelUrl(result.resolvedUrl);
                    }
                });
            }
            if (artifact.thumbnail_url) {
                try {
                    const preview = await resolvePreviewUrl(
                        artifact.thumbnail_url,
                    );
                    if (isMounted) {
                        setPhotoPreview(preview);
                    }
                } catch (error) {
                    if (isMounted) {
                        setPhotoError(
                            error instanceof Error
                                ? error.message
                                : "Не удалось загрузить фото.",
                        );
                    }
                }
            }

            const { data: measurement } = await supabase
                .from("artifact_measurements")
                .select("*")
                .eq("artifact_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!isMounted) return;

            if (measurement) {
                setMeasurementId(measurement.id);
                setForm((prev) => ({
                    ...prev,
                    cipherId: measurement.cipher_id ?? "",
                    dating: measurement.dating ?? "",
                    placeOfCreation: measurement.place_of_creation ?? "",
                    publisherName: measurement.publisher_name ?? "",
                    length:
                        measurement.length !== null
                            ? String(measurement.length)
                            : "",
                    width:
                        measurement.width !== null
                            ? String(measurement.width)
                            : "",
                    height:
                        measurement.height !== null
                            ? String(measurement.height)
                            : "",
                    weight:
                        measurement.weight !== null
                            ? String(measurement.weight)
                            : "",
                    material: measurement.material ?? "",
                    technique: measurement.technique ?? "",
                    cost:
                        measurement.cost !== null
                            ? String(measurement.cost)
                            : "",
                    quantity:
                        measurement.quantity !== null
                            ? String(measurement.quantity)
                            : "",
                    subject: measurement.subject ?? "",
                    legend: measurement.legend ?? "",
                    bibliography: measurement.bibliography ?? "",
                    reportAuthor: measurement.report_author ?? "",
                    conditionDescription:
                        measurement.condition_description ?? "",
                    restorationDetails: measurement.restoration_details ?? "",
                }));
            }

            setAutoSaveReady(true);
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    useEffect(() => {
        if (!autoSaveReady || !user || !isPaperFilled) return;

        const timeout = window.setTimeout(async () => {
            try {
                setIsSaving(true);
                setAutoSaveMessage("Сохраняем изменения...");
                const id = await ensureArtifact();
                await saveArtifact(id);
                await saveMeasurement(id);
                setAutoSaveMessage("Все изменения сохранены.");
            } catch (error) {
                setAutoSaveMessage(
                    error instanceof Error
                        ? error.message
                        : "Ошибка автосохранения.",
                );
            } finally {
                setIsSaving(false);
            }
        }, 800);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [autoSaveReady, form, user, isPaperFilled, hasMeasurementValues]);

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
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/70">
                        {isEditMode
                            ? "Редактирование отчета"
                            : "Создание отчета"}
                    </p>
                    {isEditMode && projectId && (
                        <span className="text-xs text-secondary/70">
                            ID проекта: {projectId}
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-bold text-textDark">
                    Карточка археологического артефакта
                </h1>
                <p className="text-sm text-secondary/80 max-w-2xl">
                    Заполните только те поля, которые у вас есть. Остальные
                    данные можно оставить пустыми — карточка все равно будет
                    сохранена.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                    APEX-AI
                                </p>
                                <h2 className="text-lg font-semibold text-textDark">
                                    Классификация по 3D-модели и фото
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={handleAiClassify}
                                    disabled={
                                        aiLoading || aiPreparing || !modelReady
                                    }
                                >
                                    {aiLoading
                                        ? "Отправка..."
                                        : aiPreparing
                                          ? "Подготовка..."
                                          : "AI по 3D-модели"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAiClassify2d}
                                    disabled={
                                        aiLoading ||
                                        aiPreparing ||
                                        (!photoPreview &&
                                            !form.photoUrl.trim())
                                    }
                                >
                                    {aiLoading
                                        ? "Отправка..."
                                        : aiPreparing
                                          ? "Подготовка..."
                                          : "AI по фото"}
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm text-secondary/80">
                            Можно запустить анализ либо по скриншотам 3D-модели
                            с разных ракурсов, либо по фото из заставки
                            артефакта.
                        </p>

                        {!modelReady && (
                            <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-xs text-secondary/80">
                                Для классификации нужна загруженная 3D-модель.
                            </div>
                        )}
                        {aiError && (
                            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {aiError}
                            </div>
                        )}
                        {aiPreviewOpen && aiPreviewUrls.length > 0 && (
                            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-secondary/60">
                                        Предпросмотр скриншотов
                                    </p>
                                    <span className="text-xs text-secondary/70">
                                        {aiPreviewUrls.length} шт.
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {aiPreviewUrls.map((url, index) => (
                                        <img
                                            key={url}
                                            src={url}
                                            alt={`Скриншот ${index + 1}`}
                                            className="w-full h-28 object-cover rounded-xl border border-black/10"
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={handleAiConfirm}
                                        disabled={aiLoading || aiPreparing}
                                    >
                                        {aiLoading
                                            ? "Отправка..."
                                            : "Подтвердить и отправить"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAiPreviewClose}
                                        disabled={aiLoading || aiPreparing}
                                    >
                                        Закрыть
                                    </Button>
                                </div>
                            </div>
                        )}
                        {aiSuggestions && (
                            <div className="grid gap-4 md:grid-cols-2 text-sm text-secondary">
                                <AiDetail
                                    label="Датировка"
                                    value={form.dating}
                                    originalValue={aiBaseline.dating}
                                    aiValue={aiSuggestions.dating}
                                    isApplied={aiApplied.dating}
                                    onApply={() => {
                                        applyAiField(
                                            "dating",
                                            aiSuggestions.dating,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            dating: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "dating",
                                            aiBaseline.dating,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            dating: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Место изготовления"
                                    value={form.placeOfCreation}
                                    originalValue={aiBaseline.place_of_creation}
                                    aiValue={aiSuggestions.place_of_creation}
                                    isApplied={aiApplied.place_of_creation}
                                    onApply={() => {
                                        applyAiField(
                                            "place_of_creation",
                                            aiSuggestions.place_of_creation,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            place_of_creation: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "place_of_creation",
                                            aiBaseline.place_of_creation,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            place_of_creation: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Материал"
                                    value={form.material}
                                    originalValue={aiBaseline.material}
                                    aiValue={aiSuggestions.material}
                                    isApplied={aiApplied.material}
                                    onApply={() => {
                                        applyAiField(
                                            "material",
                                            aiSuggestions.material,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            material: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "material",
                                            aiBaseline.material,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            material: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Техника"
                                    value={form.technique}
                                    originalValue={aiBaseline.technique}
                                    aiValue={aiSuggestions.technique}
                                    isApplied={aiApplied.technique}
                                    onApply={() => {
                                        applyAiField(
                                            "technique",
                                            aiSuggestions.technique,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            technique: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "technique",
                                            aiBaseline.technique,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            technique: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Количество"
                                    value={form.quantity}
                                    originalValue={aiBaseline.quantity}
                                    aiValue={aiSuggestions.quantity}
                                    isApplied={aiApplied.quantity}
                                    onApply={() => {
                                        applyAiField(
                                            "quantity",
                                            aiSuggestions.quantity,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            quantity: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "quantity",
                                            aiBaseline.quantity,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            quantity: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Тема"
                                    value={form.subject}
                                    originalValue={aiBaseline.subject}
                                    aiValue={aiSuggestions.subject}
                                    isApplied={aiApplied.subject}
                                    onApply={() => {
                                        applyAiField(
                                            "subject",
                                            aiSuggestions.subject,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            subject: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "subject",
                                            aiBaseline.subject,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            subject: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Легенда"
                                    value={form.legend}
                                    originalValue={aiBaseline.legend}
                                    aiValue={aiSuggestions.legend}
                                    isApplied={aiApplied.legend}
                                    onApply={() => {
                                        applyAiField(
                                            "legend",
                                            aiSuggestions.legend,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            legend: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "legend",
                                            aiBaseline.legend,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            legend: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Библиография"
                                    value={form.bibliography}
                                    originalValue={aiBaseline.bibliography}
                                    aiValue={aiSuggestions.bibliography}
                                    isApplied={aiApplied.bibliography}
                                    onApply={() => {
                                        applyAiField(
                                            "bibliography",
                                            aiSuggestions.bibliography,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            bibliography: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "bibliography",
                                            aiBaseline.bibliography,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            bibliography: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Автор отчета"
                                    value={form.reportAuthor}
                                    originalValue={aiBaseline.report_author}
                                    aiValue={aiSuggestions.report_author}
                                    isApplied={aiApplied.report_author}
                                    onApply={() => {
                                        applyAiField(
                                            "report_author",
                                            aiSuggestions.report_author,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            report_author: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "report_author",
                                            aiBaseline.report_author,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            report_author: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Состояние"
                                    value={form.conditionDescription}
                                    originalValue={
                                        aiBaseline.condition_description
                                    }
                                    aiValue={
                                        aiSuggestions.condition_description
                                    }
                                    isApplied={aiApplied.condition_description}
                                    onApply={() => {
                                        applyAiField(
                                            "condition_description",
                                            aiSuggestions.condition_description,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            condition_description: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "condition_description",
                                            aiBaseline.condition_description,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            condition_description: false,
                                        }));
                                    }}
                                />
                                <AiDetail
                                    label="Реставрация"
                                    value={form.restorationDetails}
                                    originalValue={
                                        aiBaseline.restoration_details
                                    }
                                    aiValue={aiSuggestions.restoration_details}
                                    isApplied={aiApplied.restoration_details}
                                    onApply={() => {
                                        applyAiField(
                                            "restoration_details",
                                            aiSuggestions.restoration_details,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            restoration_details: true,
                                        }));
                                    }}
                                    onKeep={() => {
                                        applyAiField(
                                            "restoration_details",
                                            aiBaseline.restoration_details,
                                        );
                                        setAiApplied((prev) => ({
                                            ...prev,
                                            restoration_details: false,
                                        }));
                                    }}
                                />
                            </div>
                        )}
                        {!aiSuggestions && (
                            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-xs text-secondary/80">
                                Запустите классификацию, чтобы получить
                                подсказки APEX-AI.
                            </div>
                        )}
                    </section>

                    <section className="rounded-[2rem] border border-black/10 bg-white/80 p-6 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                    3D-модель
                                </p>
                                <h2 className="text-lg font-semibold text-textDark">
                                    Просмотр и скриншоты
                                </h2>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary/80">
                            <span>
                                Статус:{" "}
                                {previewModelUrl
                                    ? "модель найдена"
                                    : "модель не найдена"}
                            </span>
                        </div>

                        <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                            <div className="h-[320px] w-full">
                                {previewModelUrl ? (
                                    previewModelType === "obj" ? (
                                        <ObjModelViewer
                                            ref={objViewerRef}
                                            objUrl={previewModelUrl}
                                            mtlUrl={previewMaterialUrl}
                                            height="100%"
                                            onReady={() => setModelReady(true)}
                                        />
                                    ) : (
                                        <ModelViewer
                                            ref={modelViewerRef}
                                            modelUrl={previewModelUrl}
                                            autoRotate
                                            onReady={() => setModelReady(true)}
                                        />
                                    )
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-secondary/70">
                                        Модель не найдена
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-secondary/70">
                            Скриншоты будут сняты автоматически с 6 ракурсов.
                        </p>
                        {modelError && (
                            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {modelError}
                            </div>
                        )}
                    </section>
                </div>

                <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        <section className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-textDark">
                                    Общие данные
                                </h2>
                                <span className="text-xs text-secondary/70">
                                    Лист отчета
                                </span>
                            </div>

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
                                            handlePhotoUpload(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    />
                                    {photoUploading && (
                                        <span className="text-xs text-secondary/80">
                                            Загрузка фото...
                                        </span>
                                    )}
                                    {photoError && (
                                        <span className="text-xs text-destructive">
                                            {photoError}
                                        </span>
                                    )}
                                </label>
                            </div>

                            <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-4 text-sm text-secondary/80">
                                Фото сохраняется в Supabase Storage. При
                                необходимости вы можете загрузить новое
                                изображение позже.
                            </div>
                            {photoPreview && (
                                <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-secondary/60 mb-2">
                                        Предпросмотр
                                    </p>
                                    <img
                                        src={photoPreview}
                                        alt="Фото артефакта"
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
                            placeholder="Источник, публикации, архивы"
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
                            ? "Все изменения сохранятся после отправки."
                            : "Заполните любые поля, затем сохраните карточку."}
                    </div>
                    {autoSaveMessage && (
                        <div className="text-xs text-secondary/70">
                            {isSaving ? "Автосохранение..." : autoSaveMessage}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="submit"
                            variant="primary"
                            loading={loading}
                        >
                            {isEditMode
                                ? "Сохранить изменения"
                                : "Сохранить карточку"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
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

type AiDetailProps = {
    label: string;
    value?: string | number | null;
    originalValue?: string | number | null;
    aiValue?: string | number | null;
    isApplied?: boolean;
    onApply?: () => void;
    onKeep?: () => void;
};

function AiDetail({
    label,
    value,
    originalValue,
    aiValue,
    isApplied,
    onApply,
    onKeep,
}: AiDetailProps) {
    const hasAiValue =
        aiValue !== undefined &&
        aiValue !== null &&
        (typeof aiValue === "number" || String(aiValue).trim().length > 0);

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-secondary/60">
                {label}
            </span>
            <span className="text-sm text-textDark">
                {formatDetailValue(value)}
            </span>
            {hasAiValue && (
                <div className="mt-2 rounded-xl border border-black/10 bg-backgroundLight/70 p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-secondary">
                            Было
                        </span>
                        <span className="text-right text-secondary">
                            {formatDetailValue(originalValue)}
                        </span>
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-3">
                        <span className="font-semibold text-primary">
                            APEX-AI
                        </span>
                        <span className="text-right text-primary">
                            {formatDetailValue(aiValue)}
                        </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onApply}
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                isApplied
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-black/10 text-textDark hover:border-primary/40"
                            }`}
                        >
                            Применить
                        </button>
                        <button
                            type="button"
                            onClick={onKeep}
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                isApplied === false
                                    ? "border-secondary bg-secondary/10 text-secondary"
                                    : "border-black/10 text-textDark hover:border-secondary/40"
                            }`}
                        >
                            Оставить
                        </button>
                    </div>
                </div>
            )}
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
