import { put } from "@vercel/blob";

export const config = {
  api: { bodyParser: false }
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function extractMultipartFile(buffer, boundary) {
  const marker = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(marker) + marker.length;
  while (start >= marker.length) {
    const next = buffer.indexOf(marker, start);
    if (next === -1) break;
    parts.push(buffer.slice(start, next));
    start = next + marker.length;
  }
  for (const part of parts) {
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd).toString("utf8");
    if (!headers.includes('name="file"')) continue;
    const nameMatch = headers.match(/filename="([^"]+)"/i);
    const typeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
    let data = part.slice(headerEnd + 4);
    if (data.slice(-2).toString() === "\r\n") data = data.slice(0, -2);
    return {
      filename: (nameMatch?.[1] || `image-${Date.now()}.jpg`).replace(/[^\w.\-]/g, "_"),
      contentType: typeMatch?.[1] || "application/octet-stream",
      data
    };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "Image uploads need Vercel Blob. Connect a Blob store to this project first." });
  }

  const ct = req.headers["content-type"] || "";
  const match = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match?.[1] || match?.[2];
  if (!boundary) return res.status(400).json({ error: "Invalid multipart upload." });

  try {
    const raw = await readBody(req);
    if (raw.length > 5 * 1024 * 1024) return res.status(413).json({ error: "Image is too large. Keep it under 4 MB." });
    const file = extractMultipartFile(raw, boundary);
    if (!file) return res.status(400).json({ error: "No image file received." });
    if (!file.contentType.startsWith("image/")) return res.status(400).json({ error: "Please upload an image." });

    const blob = await put(`grok-inputs/${Date.now()}-${file.filename}`, file.data, {
      access: "public",
      contentType: file.contentType,
      addRandomSuffix: true
    });
    return res.status(200).json({ url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
