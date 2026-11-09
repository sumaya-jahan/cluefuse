
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import https from "node:https";
import { resolve4 } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

dotenv.config({ path: "server/.env" });

const app = express();
const PORT = 8787;

const API_URL =
    "https://api.prod.adaptionlabs.ai/api/v1/responses";

const MODEL = "qwen3.8-27b";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

app.use(
    cors({
        origin: /^http:\/\/localhost:517\d$/,
    })
);

app.use(express.json({ limit: "22mb" }));

// =====================================
// AI SYSTEM INSTRUCTIONS
// =====================================

const SYSTEM_PROMPT = `
You are CLUEFUSE, a defensive privacy auditor.

Analyze content owned by the user or
content they are authorized to audit.

Identify:
1. Visible privacy clues.
2. Relationships between separate artifacts.
3. Possible cumulative information exposure.
4. Practical privacy recommendations.

Important:
- Do not identify private individuals.
- Do not reveal exact private locations.
- Do not reconstruct real personal schedules.
- Do not repeat phone numbers, passwords,
  addresses, account numbers or secrets.
- Explain uncertainty clearly.
- Do not invent evidence.
- If no significant clues exist, say so.

Return ONLY valid JSON in this structure:

{
  "risk": "Low",
  "summary": "Overall analysis",
  "clues": [
    {
      "id": "1",
      "title": "Privacy clue",
      "source": "Image 1 or Text note",
      "evidence": "Non-sensitive evidence description",
      "risk": "Medium"
    }
  ],
  "connections": [
    {
      "from": "1",
      "to": "2",
      "label": "Possible relationship"
    }
  ],
  "recommendations": [
    "Specific defensive recommendation"
  ]
}

Risk values: Low, Medium, High.
Maximum 8 clues.
Maximum 10 connections.
Maximum 6 recommendations.
Use valid clue IDs in connections.
No markdown or thinking process.
`;

// =====================================
// GENERAL HELPERS
// =====================================

function normalizeRisk(value) {
    const risk = String(value || "").toLowerCase();

    if (risk === "low") return "Low";
    if (risk === "high") return "High";

    return "Medium";
}

function cleanReport(result) {
    const clues = Array.isArray(result.clues)
        ? result.clues.slice(0, 8).map((clue, index) => ({
            id: String(index + 1),
            originalId: String(clue.id ?? index + 1),
            title: String(
                clue.title ?? "Privacy clue"
            ).slice(0, 100),
            source: String(
                clue.source ?? "Input"
            ).slice(0, 100),
            evidence: String(
                clue.evidence ?? ""
            ).slice(0, 500),
            risk: normalizeRisk(clue.risk),
        }))
        : [];

    const idMap = new Map(
        clues.map((clue) => [
            clue.originalId,
            clue.id,
        ])
    );

    const connections = Array.isArray(result.connections)
        ? result.connections
            .filter(
                (connection) =>
                    idMap.has(String(connection.from)) &&
                    idMap.has(String(connection.to))
            )
            .slice(0, 10)
            .map((connection) => ({
                from: idMap.get(String(connection.from)),
                to: idMap.get(String(connection.to)),
                label: String(
                    connection.label ?? "Possible link"
                ).slice(0, 120),
            }))
        : [];

    return {
        risk: normalizeRisk(result.risk),

        summary: String(
            result.summary ?? ""
        ).slice(0, 1200),

        clues: clues.map(
            ({ originalId, ...clue }) => clue
        ),

        connections,

        recommendations: Array.isArray(
            result.recommendations
        )
            ? result.recommendations
                .slice(0, 6)
                .map((item) =>
                    String(item).slice(0, 300)
                )
            : [],
    };
}

function extractFinalText(data) {
    const messages = Array.isArray(data.output)
        ? data.output.filter(
            (item) => item.type === "message"
        )
        : [];

    const texts = messages.flatMap((item) =>
        Array.isArray(item.content)
            ? item.content
                .filter(
                    (part) =>
                        part.type === "output_text" &&
                        typeof part.text === "string"
                )
                .map((part) => part.text)
            : []
    );

    return (
        texts.join("\n").trim() ||
        String(data.output_text || "").trim()
    );
}

// =====================================
// PUBLIC IMAGE URL SECURITY
// =====================================

function isPublicIPv4(address) {
    try {
        const parsed = ipaddr.parse(address);

        return (
            parsed.kind() === "ipv4" &&
            parsed.range() === "unicast"
        );
    } catch {
        return false;
    }
}

function validateImageSignature(buffer, type) {
    if (type === "image/png") {
        return (
            buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
                Buffer.from([
                    137, 80, 78, 71, 13, 10, 26, 10,
                ])
            )
        );
    }

    if (type === "image/jpeg") {
        return (
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
        );
    }

    if (type === "image/webp") {
        return (
            buffer.length >= 12 &&
            buffer.subarray(0, 4).toString() === "RIFF" &&
            buffer.subarray(8, 12).toString() === "WEBP"
        );
    }

    return false;
}

// =====================================
// DOWNLOAD IMAGE FROM PUBLIC URL
// =====================================

async function downloadPublicImage(inputUrl) {
    let parsed;

    try {
        parsed = new URL(inputUrl);
    } catch {
        throw new Error("Invalid image URL.");
    }

    if (
        parsed.protocol !== "https:" ||
        parsed.port ||
        parsed.username ||
        parsed.password ||
        !parsed.hostname ||
        isIP(parsed.hostname)
    ) {
        throw new Error(
            "Use a direct public HTTPS image URL."
        );
    }

    const hostname = parsed.hostname.toLowerCase();

    if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
    ) {
        throw new Error(
            "Private network hosts are not allowed."
        );
    }

    const addresses = await resolve4(hostname);

    if (
        !addresses.length ||
        addresses.some(
            (address) => !isPublicIPv4(address)
        )
    ) {
        throw new Error(
            "Image host must resolve to public IP addresses."
        );
    }

    const pinnedIP = addresses[0];

    return new Promise((resolve, reject) => {
        let settled = false;

        function fail(error) {
            if (!settled) {
                settled = true;
                reject(error);
            }
        }

        const request = https.get(
            parsed,
            {
                timeout: 10000,

                // Only use the validated IPv4 address.
                family: 4,
                autoSelectFamily: false,

                headers: {
                    Accept:
                        "image/png,image/jpeg,image/webp",
                    "User-Agent":
                        "CLUEFUSE-ImageFetcher/1.0",
                },

                // FIX: Handle both Node.js DNS lookup modes.
                // Some Node.js versions request an array.
                lookup: (_host, options, callback) => {
                    if (options.all) {
                        callback(null, [
                            {
                                address: pinnedIP,
                                family: 4,
                            },
                        ]);
                    } else {
                        callback(null, pinnedIP, 4);
                    }
                },
            },

            (response) => {
                // Redirects are deliberately not followed.
                if (response.statusCode !== 200) {
                    response.resume();

                    return fail(
                        new Error(
                            `Image returned HTTP ${response.statusCode}`
                        )
                    );
                }

                const type = String(
                    response.headers["content-type"] || ""
                )
                    .split(";")[0]
                    .trim()
                    .toLowerCase();

                const allowedTypes = [
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                ];

                if (!allowedTypes.includes(type)) {
                    response.resume();

                    return fail(
                        new Error(
                            "URL must point directly to PNG, JPG or WEBP."
                        )
                    );
                }

                const declaredLength = Number(
                    response.headers["content-length"] || 0
                );

                if (
                    !Number.isFinite(declaredLength) ||
                    declaredLength > MAX_IMAGE_BYTES
                ) {
                    response.resume();

                    return fail(
                        new Error(
                            "Image exceeds the 5 MB limit."
                        )
                    );
                }

                const chunks = [];
                let received = 0;

                response.on("data", (chunk) => {
                    if (settled) return;

                    received += chunk.length;

                    if (received > MAX_IMAGE_BYTES) {
                        fail(
                            new Error(
                                "Downloaded image exceeds 5 MB."
                            )
                        );

                        response.destroy();
                        return;
                    }

                    chunks.push(chunk);
                });

                response.on("end", () => {
                    if (settled) return;

                    const buffer = Buffer.concat(chunks);

                    if (
                        !validateImageSignature(buffer, type)
                    ) {
                        return fail(
                            new Error(
                                "Downloaded file is not a valid image."
                            )
                        );
                    }

                    settled = true;

                    resolve({
                        type,
                        dataUrl:
                            `data:${type};base64,` +
                            buffer.toString("base64"),
                    });
                });

                response.on("error", fail);
            }
        );

        request.on("timeout", () => {
            request.destroy(
                new Error("Image download timed out.")
            );
        });

        request.on("error", fail);
    });
}

// =====================================
// HEALTH CHECK
// =====================================

app.get("/api/health", (_req, res) => {
    res.json({
        status: "running",
        provider: "Adaption",
        model: MODEL,
        configured: Boolean(
            process.env.ADAPTION_API_KEY
        ),
    });
});

// =====================================
// IMAGE URL ENDPOINT
// =====================================

app.post("/api/image-from-url", async (req, res) => {
    try {
        const imageUrl = req.body?.url;

        if (
            typeof imageUrl !== "string" ||
            imageUrl.length > 2048
        ) {
            return res.status(400).json({
                error: "Enter a valid image URL.",
            });
        }

        const image = await downloadPublicImage(
            imageUrl.trim()
        );

        return res.json(image);
    } catch (error) {
        return res.status(400).json({
            error:
                error.message ||
                "Unable to download image.",
        });
    }
});

// =====================================
// AI ANALYSIS ENDPOINT
// =====================================

app.post("/api/analyze", async (req, res) => {
    const apiKey = process.env.ADAPTION_API_KEY;

    if (!apiKey) {
        return res.status(503).json({
            error:
                "Missing ADAPTION_API_KEY in server/.env",
        });
    }

    const { images = [], text = "" } = req.body ?? {};

    if (
        !Array.isArray(images) ||
        typeof text !== "string" ||
        images.length > 8 ||
        text.length > 5000
    ) {
        return res.status(400).json({
            error: "Invalid analysis input.",
        });
    }

    if (!images.length && !text.trim()) {
        return res.status(400).json({
            error: "Upload an image or enter text.",
        });
    }

    const content = [
        {
            type: "input_text",
            text:
                "Perform a defensive privacy analysis " +
                "of these user-authorized artifacts.\n\n" +
                "TEXT NOTE:\n" +
                (text.trim() || "(none)") +
                "\n\nReturn the required JSON only.",
        },
    ];

    for (let i = 0; i < images.length; i++) {
        const image = images[i];

        if (
            typeof image !== "string" ||
            image.length > 7_000_000 ||
            !/^data:image\/(png|jpeg|webp);base64,/.test(
                image
            )
        ) {
            return res.status(400).json({
                error:
                    "Invalid image. Use PNG/JPG/WEBP under 5 MB.",
            });
        }

        content.push({
            type: "input_text",
            text: `Image ${i + 1}:`,
        });

        content.push({
            type: "input_image",
            image_url: image,
        });
    }

    try {
        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            110000
        );

        let response;

        try {
            response = await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },

                body: JSON.stringify({
                    model: MODEL,
                    instructions: SYSTEM_PROMPT,

                    input: [
                        {
                            role: "user",
                            content,
                        },
                    ],

                    max_output_tokens: 6000,
                    temperature: 0.1,
                    store: false,
                    agentic_memory: false,
                    tool_choice: "none",
                }),

                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        const data = await response.json();

        if (!response.ok) {
            return res.status(502).json({
                error:
                    `Adaption API error (${response.status}): ` +
                    String(
                        data.error?.message ||
                        "Check API access and credits."
                    ),
            });
        }

        if (
            data.status &&
            data.status !== "completed"
        ) {
            return res.status(502).json({
                error:
                    "AI response incomplete. Try a shorter input.",
            });
        }

        const raw = extractFinalText(data);

        if (!raw) {
            return res.status(502).json({
                error: "AI returned no final answer.",
            });
        }

        const cleaned = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");

        if (start < 0 || end <= start) {
            return res.status(502).json({
                error:
                    "AI did not return a valid JSON report.",
            });
        }

        let parsed;

        try {
            parsed = JSON.parse(
                cleaned.slice(start, end + 1)
            );
        } catch {
            return res.status(502).json({
                error:
                    "AI returned malformed JSON. Please retry.",
            });
        }

        return res.json({
            report: cleanReport(parsed),
            provider: "Adaption",
            model: MODEL,
        });
    } catch (error) {
        console.error(
            "CLUEFUSE analysis error:",
            error.message
        );

        return res.status(502).json({
            error:
                error.name === "AbortError"
                    ? "AI request timed out."
                    : "Could not complete AI analysis.",
        });
    }
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
    console.log(
        `CLUEFUSE API running at http://localhost:${PORT}`
    );
});
