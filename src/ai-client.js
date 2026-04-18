function extractJsonString(result) {
  const raw =
    result?.output_text ||
    result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) {
    throw new Error("API returned empty JSON string.");
  }

  return raw.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
}

export async function requestStructuredJson(apiUrl, payload, { retries = 3 } = {}) {
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let result;

      try {
        result = JSON.parse(rawText);
      } catch {
        result = { error: { message: rawText } };
      }

      if (!response.ok) {
        const errorMessage =
          result?.error?.message ||
          result?.message ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const jsonString = extractJsonString(result);

      return {
        data: JSON.parse(jsonString),
        raw: jsonString,
      };
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Structured request failed unexpectedly.");
}
