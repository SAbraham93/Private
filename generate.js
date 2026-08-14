const BASE = "https://openrouter.ai/api/v1";
const MODEL = "x-ai/grok-imagine-video";

function getKey() {
  const raw = process.env.OPENROUTER_API_KEY;
  if (!raw) throw new Error("OPENROUTER_API_KEY is not configured in Vercel.");
  const key = String(raw).trim().replace(/^["']|["']$/g, "");
  if (!key.startsWith("sk-or-")) {
    throw new Error("OPENROUTER_API_KEY does not look like an OpenRouter key. It should start with sk-or-.");
  }
  if (/[\r\n]/.test(key)) {
    throw new Error("OPENROUTER_API_KEY contains a line break. Delete and re-add it in Vercel.");
  }
  return key;
}

async function safeJson(response) {
  const text = await response.text();
  try { return { data: JSON.parse(text), text }; }
  catch { return { data: null, text }; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const key = getKey();
    const bodyIn = req.body || {};
    const prompt = typeof bodyIn.prompt === "string" ? bodyIn.prompt.trim() : "";
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    const duration = Number(bodyIn.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 15) {
      return res.status(400).json({ error: "Duration must be an integer from 1 to 15 seconds." });
    }

    const allowedRes = new Set(["480p", "720p"]);
    const allowedRatios = new Set(["16:9","9:16","1:1","4:3","3:4","3:2","2:3"]);
    const resolution = allowedRes.has(bodyIn.resolution) ? bodyIn.resolution : "720p";
    const aspect_ratio = allowedRatios.has(bodyIn.aspect_ratio) ? bodyIn.aspect_ratio : "9:16";

    const payload = {
      model: MODEL,
      prompt,
      duration,
      resolution,
      aspect_ratio
    };

    if (bodyIn.imageUrl) {
      let parsed;
      try { parsed = new URL(String(bodyIn.imageUrl)); }
      catch { return res.status(400).json({ error: "The uploaded image URL is invalid." }); }

      if (parsed.protocol !== "https:") {
        return res.status(400).json({ error: "The image URL must use HTTPS." });
      }

      payload.frame_images = [{
        type: "image_url",
        image_url: { url: parsed.toString() },
        frame_type: "first_frame"
      }];
    }

    const upstream = await fetch(`${BASE}/videos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const { data, text } = await safeJson(upstream);

    if (!upstream.ok) {
      const msg =
        data?.error?.message ||
        (typeof data?.error === "string" ? data.error : null) ||
        text ||
        `OpenRouter returned HTTP ${upstream.status}`;
      return res.status(upstream.status).json({
        error: msg,
        source: "OpenRouter",
        http_status: upstream.status
      });
    }

    if (!data?.id) {
      return res.status(502).json({
        error: "OpenRouter accepted the request but did not return a job ID.",
        source: "OpenRouter",
        response_preview: text.slice(0, 500)
      });
    }

    return res.status(202).json({
      id: data.id,
      status: data.status || "pending",
      polling_url: data.polling_url || null,
      generation_id: data.generation_id || null
    });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || String(e),
      source: "Vercel server"
    });
  }
}
