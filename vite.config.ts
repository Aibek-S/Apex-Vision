import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

const RESULTS_DIR =
    "C:/Users/Acer/Documents/Apex/FLL/watcher_3d/projects/results";
const PROJECT_ROOT = process.cwd();

type LatestModelResult = {
    fullPath: string;
    mtimeMs: number;
    ext: string;
};

const ALLOWED_MODEL_EXTENSIONS = new Set(["obj", "glb", "gltf"]);

const findLatestModelFile = async (
    rootDir: string
): Promise<LatestModelResult | null> => {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    let latest: LatestModelResult | null = null;

    for (const entry of entries) {
        const entryPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            const nested = await findLatestModelFile(entryPath);
            if (nested && (!latest || nested.mtimeMs > latest.mtimeMs)) {
                latest = nested;
            }
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const ext = path.extname(entry.name).toLowerCase().replace(".", "");
        if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
            continue;
        }

        const stat = await fs.stat(entryPath);
        if (!latest || stat.mtimeMs > latest.mtimeMs) {
            latest = { fullPath: entryPath, mtimeMs: stat.mtimeMs, ext };
        }
    }

    return latest;
};

const findModelByCode = async (
    rootDir: string,
    code: string
): Promise<LatestModelResult | null> => {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    let found: LatestModelResult | null = null;

    for (const entry of entries) {
        const entryPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            const nested = await findModelByCode(entryPath, code);
            if (nested) {
                found = nested;
                break;
            }
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const parsed = path.parse(entry.name);
        const ext = parsed.ext.toLowerCase().replace(".", "");
        if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
            continue;
        }

        if (parsed.name === code) {
            const stat = await fs.stat(entryPath);
            found = { fullPath: entryPath, mtimeMs: stat.mtimeMs, ext };
            break;
        }
    }

    return found;
};

const getMtlForObj = async (objPath: string) => {
    const parsed = path.parse(objPath);
    const mtlPath = path.join(parsed.dir, `${parsed.name}.mtl`);
    try {
        await fs.access(mtlPath);
        return mtlPath;
    } catch {
        return null;
    }
};

const watcherApiPlugin = (): Plugin => ({
    name: "watcher-api",
    configureServer(server) {
        server.middlewares.use(
            "/api/watcher/latest",
            async (req: IncomingMessage, res: ServerResponse) => {
                if (req.method !== "GET") {
                    res.statusCode = 405;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: "Method not allowed" }));
                    return;
                }

                try {
                    const url = new URL(req.url ?? "", "http://localhost");
                    const code = url.searchParams.get("code")?.trim() || null;
                    const latestModel = code
                        ? await findModelByCode(RESULTS_DIR, code)
                        : await findLatestModelFile(RESULTS_DIR);

                    if (!latestModel) {
                        res.statusCode = 404;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ modelUrl: null }));
                        return;
                    }

                    const normalizedPath = latestModel.fullPath.replace(
                        /\\/g,
                        "/"
                    );
                    const modelUrl = `/@fs/${normalizedPath}`;
                    const mtlPath =
                        latestModel.ext === "obj"
                            ? await getMtlForObj(latestModel.fullPath)
                            : null;
                    const mtlUrl = mtlPath
                        ? `/@fs/${mtlPath.replace(/\\/g, "/")}`
                        : null;

                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.setHeader("Cache-Control", "no-store");
                    res.end(
                        JSON.stringify({
                            modelUrl,
                            modelExt: latestModel.ext,
                            mtlUrl,
                            updatedAt: latestModel.mtimeMs,
                        })
                    );
                } catch (error) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                        JSON.stringify({
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Не удалось прочитать папку результатов",
                        })
                    );
                }
            }
        );
    },
});

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), watcherApiPlugin()],
    server: {
        allowedHosts: ["66c956facc19.ngrok-free.app"],
        fs: {
            allow: [PROJECT_ROOT, RESULTS_DIR],
        },
    },
});
