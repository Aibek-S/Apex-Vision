export interface Env {
    R2_BUCKET: R2Bucket;
    PUBLIC_BASE_URL?: string;
    ALLOWED_ORIGIN?: string;
}

const DEFAULT_PREFIX = "models/";

const buildCorsHeaders = (origin: string) => ({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, X-File-Name, X-File-Size, X-File-Type",
});

const jsonResponse = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    });

const sanitizeFileName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "model";
    return trimmed.split(/[/\\]/).pop() || "model";
};

const guessContentType = (fileName: string, fallback: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".glb")) return "model/gltf-binary";
    if (lower.endsWith(".gltf")) return "model/gltf+json";
    if (lower.endsWith(".obj")) return "text/plain";
    if (lower.endsWith(".mtl")) return "text/plain";
    return fallback;
};

const normalizeBaseUrl = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.replace(/\/$/, "");
};

const buildPublicUrl = (request: Request, env: Env, key: string) => {
    const base =
        normalizeBaseUrl(env.PUBLIC_BASE_URL) ?? new URL(request.url).origin;
    return `${base}/object/${encodeURIComponent(key)}`;
};

const handleUpload = async (request: Request, env: Env) => {
    const url = new URL(request.url);
    const rawFileName = request.headers.get("x-file-name")?.trim() || "model";
    const fileName = sanitizeFileName(rawFileName);
    const providedKey = url.searchParams.get("key")?.trim() || "";
    const prefix = url.searchParams.get("prefix")?.trim() || DEFAULT_PREFIX;
    const key =
        providedKey ||
        `${prefix}${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${fileName}`;

    const body = await request.arrayBuffer();
    const contentTypeHeader =
        request.headers.get("content-type") || "application/octet-stream";
    const contentType = guessContentType(fileName, contentTypeHeader);

    await env.R2_BUCKET.put(key, body, {
        httpMetadata: { contentType },
    });

    return jsonResponse({
        key,
        url: buildPublicUrl(request, env, key),
        size: body.byteLength,
    });
};

const handleList = async (request: Request, env: Env) => {
    const url = new URL(request.url);
    const prefix = url.searchParams.get("prefix")?.trim() || "";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 1000;
    const listing = await env.R2_BUCKET.list({
        prefix,
        limit: Number.isFinite(limit) ? limit : 1000,
    });

    const objects = listing.objects.map((object) => ({
        key: object.key,
        size: object.size,
        uploaded: object.uploaded?.toISOString() ?? null,
        url: buildPublicUrl(request, env, object.key),
    }));

    return jsonResponse({
        objects,
        truncated: listing.truncated,
        cursor: listing.cursor,
    });
};

const handleGetObject = async (request: Request, env: Env, key: string) => {
    const object = await env.R2_BUCKET.get(key);
    if (!object) {
        return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return new Response(object.body, {
        headers,
    });
};

const withCors = (response: Response, origin: string) => {
    const headers = buildCorsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const origin = normalizeBaseUrl(env.ALLOWED_ORIGIN) ?? "*";

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: buildCorsHeaders(origin),
            });
        }

        const url = new URL(request.url);
        const { pathname } = url;

        try {
            if (request.method === "POST" && pathname === "/upload") {
                return withCors(await handleUpload(request, env), origin);
            }

            if (request.method === "GET" && pathname === "/objects") {
                return withCors(await handleList(request, env), origin);
            }

            if (request.method === "GET" && pathname.startsWith("/object/")) {
                const key = decodeURIComponent(
                    pathname.replace("/object/", ""),
                );
                return withCors(
                    await handleGetObject(request, env, key),
                    origin,
                );
            }

            return withCors(new Response("Not found", { status: 404 }), origin);
        } catch (error) {
            return withCors(
                jsonResponse(
                    {
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    },
                    { status: 500 },
                ),
                origin,
            );
        }
    },
};
