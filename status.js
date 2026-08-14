const BASE = "https://openrouter.ai/api/v1";

function getKey() {
  const raw = process.env.OPENROUTER_API_KEY;
  if (!raw) throw new Error("OPENROUTER_API_KEY is not configured.");
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const key = getKey();
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing job ID." });

    const upstream = await fetch(`${BASE}/videos/${encodeURIComponent(id)}`, {
      headers: { "Authorization": `Bearer ${key}` }
    });

    const text = await upstream.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || data?.error || text || `HTTP ${upstream.status}`,
        source: "OpenRouter"
      });
    }

    return res.status(200).json(data || { error: "Invalid response from OpenRouter." });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e), source: "Vercel server" });
  }
}
