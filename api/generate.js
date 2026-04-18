const DEFAULT_MODEL = "gpt-5.4";

function extractTextFromParts(parts = []) {
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

function toJsonSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(toJsonSchema);
  }

  const normalized = { ...schema };

  if (typeof normalized.type === "string") {
    normalized.type = normalized.type.toLowerCase();
  }

  if (normalized.properties) {
    normalized.properties = Object.fromEntries(
      Object.entries(normalized.properties).map(([key, value]) => [
        key,
        toJsonSchema(value),
      ]),
    );

    if (normalized.additionalProperties === undefined) {
      normalized.additionalProperties = false;
    }
  }

  if (normalized.items) {
    normalized.items = toJsonSchema(normalized.items);
  }

  return normalized;
}

function buildOpenAIRequest(body) {
  const instructions = extractTextFromParts(body?.systemInstruction?.parts);
  const input = (body?.contents || [])
    .map((item) => extractTextFromParts(item?.parts))
    .filter(Boolean)
    .join("\n\n");

  const request = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    input,
    store: false,
  };

  if (instructions) {
    request.instructions = instructions;
  }

  const responseSchema = body?.generationConfig?.responseSchema;
  if (responseSchema) {
    request.text = {
      format: {
        type: "json_schema",
        name: body?.schemaName || "structured_output",
        strict: true,
        schema: toJsonSchema(responseSchema),
      },
    };
  }

  return request;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY environment variable on the server.",
    });
  }

  const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const upstreamUrl = "https://api.openai.com/v1/responses";
  const requestBody = buildOpenAIRequest(payload);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await upstreamResponse.text();
    const contentType =
      upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8";

    res.setHeader("Content-Type", contentType);
    return res.status(upstreamResponse.status).send(responseText);
  } catch (error) {
    console.error("OpenAI proxy request failed.", error);
    return res.status(500).json({
      error: "Failed to reach OpenAI from the Vercel function.",
    });
  }
}
