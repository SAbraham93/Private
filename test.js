const MODELS_URL = "https://openrouter.ai/api/v1/videos/models";

function cleanKey() {
  const raw = process.env.OPENROUTER_API_KEY;
  if (!raw) return { error: "OPENROUTER_API_KEY is missing in Vercel." };
  const key = String(raw).trim().replace(/^["']|["']$/g, "");
  if (/[\r\n]/.test(key)) return { error: "Your API key contains a line break. Re-enter it in Vercel." };
  if (!key.startsWith("sk-or-")) return { error: "Your API key should start with sk-or-." };
  return { key };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });

  const cleaned = cleanKey();
  if (cleaned.error) return res.status(500).json({ ok:false, stage:"environment", error:cleaned.error });

  try {
    const r = await fetch(MODELS_URL, {
      headers: { "Authorization": `Bearer ${cleaned.key}` }
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        ok:false,
        stage:"openrouter",
        http_status:r.status,
        error:data?.error?.message || data?.error || text || `HTTP ${r.status}`
      });
    }

    const models = Array.isArray(data?.data) ? data.data : [];
    const grok = models.find(m => m.id === "x-ai/grok-imagine-video");

    return res.status(200).json({
      ok:true,
      message:"Vercel can reach OpenRouter and the API key is accepted.",
      grok_available:Boolean(grok),
      grok: grok ? {
        id:grok.id,
        supported_durations:grok.supported_durations,
        supported_resolutions:grok.supported_resolutions,
        supported_aspect_ratios:grok.supported_aspect_ratios
      } : null
    });
  } catch (e) {
    return res.status(500).json({
      ok:false,
      stage:"network",
      error:e?.message || String(e)
    });
  }
}
