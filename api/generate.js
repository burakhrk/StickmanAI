const DEFAULT_MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing GEMINI_API_KEY environment variable on the server.",
    });
  }

  const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const upstreamUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await upstreamResponse.text();
    const contentType =
      upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8";

    res.setHeader("Content-Type", contentType);
    return res.status(upstreamResponse.status).send(responseText);
  } catch (error) {
    console.error("Gemini proxy request failed.", error);
    return res.status(500).json({
      error: "Failed to reach Gemini from the Vercel function.",
    });
  }
}
