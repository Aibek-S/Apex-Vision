import { supabase } from "../lib/supabase";

const CAPTURE_BUCKET = "artifacts-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
];

export interface UploadArtifactImageOptions {
    file: File;
    artifactId: string;
    sessionId: string;
}

export interface UploadArtifactImageResult {
    storagePath: string;
    mimeType: string;
    fileSize: number;
}

function validateFile(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error("Допустимы только изображения (jpg, png, webp, heic)");
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error("Размер одного файла не должен превышать 10 МБ");
    }
}

export async function uploadArtifactImage({
    file,
    artifactId,
    sessionId,
}: UploadArtifactImageOptions): Promise<UploadArtifactImageResult> {
    validateFile(file);

    const timestamp = Date.now();
    const extension = file.name?.split(".").pop() ?? "jpg";
    const uniqueId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Math.random().toString(16).slice(2)}`;

    // Путь: artifactId/sessionId/filename
    const path = `${artifactId}/${sessionId}/${timestamp}-${uniqueId}.${extension}`;

    console.log("Uploading to Supabase Storage:", {
        bucket: CAPTURE_BUCKET,
        path,
        fileType: file.type,
        fileSize: file.size,
    });

    const { error } = await supabase.storage
        .from(CAPTURE_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "image/jpeg",
        });

    if (error) {
        console.error("Supabase Storage Upload Error:", error);
        throw new Error(
            `Ошибка загрузки: ${error.message} (Код: ${error.name})`
        );
    }

    return {
        storagePath: path,
        mimeType: file.type,
        fileSize: file.size,
    };
}

export async function removeArtifactImage(storagePath: string) {
    if (!storagePath) return;
    await supabase.storage.from(CAPTURE_BUCKET).remove([storagePath]);
}
