import { supabase } from "../lib/supabase";
import type { Database } from "../types/supabase";
import {
    uploadArtifactImage,
    type UploadArtifactImageResult,
} from "./storageService";

type Tables = Database["public"]["Tables"];
export type CaptureSessionRow = Tables["capture_sessions"]["Row"];
export type ArtifactRow = Tables["artifacts"]["Row"];

export interface CreateCaptureSessionInput {
    artifactId: string;
    userId: string;
    captureMode: Database["public"]["Enums"]["capture_mode"];
    notes?: string | null;
}

export interface UploadSessionImageInput {
    file: File;
    artifactId: string;
    sessionId: string;
    userId: string;
}

export async function getActiveSession(
    artifactId: string
): Promise<CaptureSessionRow | null> {
    const { data } = await supabase
        .from("capture_sessions")
        .select("*")
        .eq("artifact_id", artifactId)
        .in("status", ["created", "active"])
        .order("created_at", { ascending: false })
        .maybeSingle();

    return data ?? null;
}

export async function createCaptureSession({
    artifactId,
    userId,
    captureMode,
    notes,
}: CreateCaptureSessionInput): Promise<CaptureSessionRow> {
    // Закрываем предыдущие незавершенные сессии
    await supabase
        .from("capture_sessions")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("artifact_id", artifactId)
        .in("status", ["created", "active"]);

    const { data, error } = await supabase
        .from("capture_sessions")
        .insert({
            artifact_id: artifactId,
            user_id: userId,
            capture_mode: captureMode,
            status: "active",
            notes: notes ?? null,
        })
        .select("*")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    await supabase
        .from("artifacts")
        .update({
            capture_mode: captureMode,
            last_capture_at: new Date().toISOString(),
        })
        .eq("id", artifactId);

    return data;
}

export async function uploadSessionImage({
    file,
    artifactId,
    sessionId,
    userId,
}: UploadSessionImageInput): Promise<UploadArtifactImageResult> {
    const uploadResult = await uploadArtifactImage({
        file,
        artifactId,
        sessionId,
    });

    const { error } = await supabase.from("artifact_images").insert({
        artifact_id: artifactId,
        session_id: sessionId,
        user_id: userId,
        storage_path: uploadResult.storagePath,
        mime_type: uploadResult.mimeType,
        file_size: uploadResult.fileSize,
    });

    if (error) {
        throw new Error(error.message);
    }

    await incrementCounters(artifactId, sessionId);

    return uploadResult;
}

async function incrementCounters(artifactId: string, sessionId: string) {
    const { data: session } = await supabase
        .from("capture_sessions")
        .select("uploaded_images")
        .eq("id", sessionId)
        .single();

    const newSessionCount = (session?.uploaded_images ?? 0) + 1;
    const nowIso = new Date().toISOString();

    await supabase
        .from("capture_sessions")
        .update({
            uploaded_images: newSessionCount,
            status: "active",
        })
        .eq("id", sessionId);

    const { data: artifact } = await supabase
        .from("artifacts")
        .select("image_count")
        .eq("id", artifactId)
        .single();

    const newImageCount = (artifact?.image_count ?? 0) + 1;

    await supabase
        .from("artifacts")
        .update({
            image_count: newImageCount,
            last_capture_at: nowIso,
        })
        .eq("id", artifactId);
}

export async function completeCaptureSession(
    sessionId: string,
    artifactId: string
) {
    const finishedAt = new Date().toISOString();

    await supabase
        .from("capture_sessions")
        .update({
            status: "completed",
            finished_at: finishedAt,
        })
        .eq("id", sessionId);

    await supabase
        .from("artifacts")
        .update({
            status: "images_collected",
            validation_status: "pending",
            last_capture_at: finishedAt,
        })
        .eq("id", artifactId);
}

export async function listSessionImages(sessionId: string) {
    const { data, error } = await supabase
        .from("artifact_images")
        .select("*")
        .eq("session_id", sessionId)
        .order("uploaded_at", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

export async function cancelCaptureSession(sessionId: string) {
    await supabase
        .from("capture_sessions")
        .update({
            status: "failed",
            finished_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
}
