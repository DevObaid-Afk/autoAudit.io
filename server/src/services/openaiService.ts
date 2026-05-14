import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGE_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";

type TextGenerationInput = {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
};

type ImageGenerationInput = {
  prompt: string;
  size?: string;
  quality?: string;
};

type OpenAiPayload = Record<string, any>;

export async function generateAiText({ instructions, input, maxOutputTokens = 900 }: TextGenerationInput) {
  if (!env.openaiApiKey) {
    throw new AppError("OPENAI_API_KEY is not configured. Add it to .env and restart the API server.", 503);
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiModel,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: "text",
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAiPayload;

  if (!response.ok) {
    const message = payload?.error?.message ?? "OpenAI request failed";
    throw new AppError(message, response.status === 429 ? 429 : 502);
  }

  const text = extractOutputText(payload).trim();
  if (!text) {
    throw new AppError("OpenAI returned an empty response", 502);
  }

  return text;
}

export async function generateAiImage({ prompt, size = "1024x1024", quality = "medium" }: ImageGenerationInput) {
  if (!env.openaiApiKey) {
    throw new AppError("OPENAI_API_KEY is not configured. Add it to .env and restart the API server.", 503);
  }

  const response = await fetch(OPENAI_IMAGE_GENERATIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiImageModel,
      prompt,
      n: 1,
      size,
      quality,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAiPayload;

  if (!response.ok) {
    const message = payload?.error?.message ?? "OpenAI image generation request failed";
    throw new AppError(message, response.status === 429 ? 429 : 502);
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new AppError("OpenAI returned no image data", 502);
  }

  return Buffer.from(imageBase64, "base64");
}

function extractOutputText(payload: OpenAiPayload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("\n");
}
