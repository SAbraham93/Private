const BASE = "https://openrouter.ai/api/v1";

function getKey() {
  const raw = process.env.OPENROUTER_API_KEY;
  if (!raw) throw new Error("OPENROUTER_API_KEY is not configured.");
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  try {
    const key = getKey();
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).send("Missing job ID.");

    // Use OpenRouter's documented content endpoint directly.
    const upstream = await fetch(`${BASE}/videos/${encodeURIComponent(id)}/content`, {
      headers: { "Authorization": `Bearer ${key}` }
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).send(text || `OpenRouter returned HTTP ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") || "video/mp4";
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Content-Disposition", 'inline; filename="grok-video.mp4"');
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).send(e?.message || String(e));
  }
}
