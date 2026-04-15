import { useCallback, useEffect, useMemo, useState } from "react";
import type { Database } from "../types/supabase";
import type { CaptureSessionRow } from "../services/captureService";
import {
    cancelCaptureSession,
    completeCaptureSession,
    createCaptureSession,
    getActiveSession,
    listSessionImages,
    uploadSessionImage,
} from "../services/captureService";

type ArtifactImageRow = Database["public"]["Tables"]["artifact_images"]["Row"];

export interface UseCaptureOptions {
    artifactId?: string | null;
    userId?: string | null;
}

export function useCapture({ artifactId, userId }: UseCaptureOptions) {
    const [session, setSession] = useState<CaptureSessionRow | null>(null);
    const [images, setImages] = useState<ArtifactImageRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadQueue, setUploadQueue] = useState<number>(0);

    const hasSession = useMemo(() => Boolean(session), [session]);

    const guard = () => {
        if (!artifactId) throw new Error("Не выбран артефакт");
        if (!userId) throw new Error("Не удалось определить пользователя");
    };

    const refreshSession = useCallback(async () => {
        if (!artifactId) return;
        setLoading(true);
        setError(null);

        try {
            const activeSession = await getActiveSession(artifactId);
            setSession(activeSession);

            if (activeSession) {
                const sessionImages = await listSessionImages(activeSession.id);
                setImages(sessionImages ?? []);
            } else {
                setImages([]);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось загрузить сессию"
            );
        } finally {
            setLoading(false);
        }
    }, [artifactId]);

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    const startSession = useCallback(
        async (
            mode: Database["public"]["Enums"]["capture_mode"],
            notes?: string
        ) => {
            guard();
            setLoading(true);
            setError(null);

            try {
                const created = await createCaptureSession({
                    artifactId: artifactId!,
                    userId: userId!,
                    captureMode: mode,
                    notes,
                });
                setSession(created);
                setImages([]);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Не удалось создать сессию"
                );
            } finally {
                setLoading(false);
            }
        },
        [artifactId, userId]
    );

    const uploadFiles = useCallback(
        async (files: FileList | File[]) => {
            guard();
            if (!session) throw new Error("Сначала создайте сессию");

            const fileArray = Array.from(files as ArrayLike<File>);
            if (fileArray.length === 0) return;

            setUploading(true);
            setUploadQueue((prev) => prev + fileArray.length);
            setError(null);

            try {
                for (const file of fileArray) {
                    await uploadSessionImage({
                        file,
                        artifactId: artifactId!,
                        sessionId: session.id,
                        userId: userId!,
                    });
                }

                const updatedImages = await listSessionImages(session.id);
                setImages(updatedImages ?? []);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Ошибка при загрузке файлов"
                );
            } finally {
                setUploadQueue(0);
                setUploading(false);
            }
        },
        [artifactId, session, userId]
    );

    const finishSession = useCallback(async () => {
        guard();
        if (!session) return;
        setLoading(true);
        setError(null);

        try {
            await completeCaptureSession(session.id, artifactId!);
            setSession({
                ...session,
                status: "completed",
                finished_at: new Date().toISOString(),
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось завершить сессию"
            );
        } finally {
            setLoading(false);
        }
    }, [artifactId, session]);

    const abortSession = useCallback(async () => {
        if (!session) return;
        setLoading(true);
        try {
            await cancelCaptureSession(session.id);
            setSession(null);
            setImages([]);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось отменить сессию"
            );
        } finally {
            setLoading(false);
        }
    }, [session]);

    return {
        session,
        images,
        loading,
        uploading,
        uploadQueue,
        error,
        hasSession,
        refreshSession,
        startSession,
        uploadFiles,
        finishSession,
        abortSession,
    };
}
