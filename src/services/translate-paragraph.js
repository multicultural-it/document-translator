import { cleanJson } from "../utils/utils.js";
import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;
const SYSTEM_PROMPT = `You're an expert translator. Your task is to translate both the entire paragraph and each of its individual nodes accurately and culturally appropriately. Each node is an essential part of the paragraph, and it's crucial that the translations of the nodes are coherent with that of the full paragraph. Ensure your translations are clear and engaging.`;

const USER_PROMPT_TEMPLATE = `Ensure an accurate and culturally appropriate translation for {targetLanguage} speakers. The translation should be of both the complete paragraph and each individual node, considering the whole paragraph's context to ensure accuracy and appropriateness in the translation. Maintain an engaging tone.

Example:
Input: 
{
    "paragraph": "This product is the best on the market.",
    "nodes": [
      {
        "index": 1,
        "text": "This product is the "
      },
      {
        "index": 2,
        "text": "best "
      },
      {
        "index": 3,
        "text": "on the market."
      }
    ]
  }
Output: 
{
  "paragraph": "Este producto es el mejor del mercado.",
  "nodes": [
    {
      "index": 1,
      "translation": "Este producto es el "
    },
    {
      "index": 2,
      "translation": "mejor "
    },
    {
      "index": 3,
      "translation": "del mercado."
    }
  ]
}

Input: 
{
    "paragraph": "{paragraph}",
    "nodes": [{nodes}]
}
Output:

`;

function generateUserPrompt({ paragraph, targetLanguage }) {
  let nodesString = JSON.stringify(paragraph.nodes, null, 2);

  return USER_PROMPT_TEMPLATE.replace("{paragraph}", paragraph.paragraph)
    .replace("{nodes}", nodesString)
    .replace("{targetLanguage}", targetLanguage);
}

function generateSystemPrompt() {
  return SYSTEM_PROMPT;
}

async function translateParagraph({ paragraph, targetLanguage }) {
  const userPrompt = generateUserPrompt({
    paragraph,
    targetLanguage,
  });

  const systemPrompt = generateSystemPrompt({ paragraph });

  let result;
  let parsedResult;

  while (true) {
    result = await handleRetries({
      userPrompt,
      systemPrompt,
      paragraph,
    });

    try {
      const cleanResult = cleanJson(result);
      parsedResult = JSON.parse(cleanResult);

      break;
    } catch (jsonError) {
      console.log("Error al parsear JSON. Reintentando...");
    }

    // En caso de error de límite de tasa
    if (result.error && result.error.code === "rate_limit_exceeded") {
      console.log(
        "Límite de tasa alcanzado. Esperando 60 segundos antes de reintentar..."
      );
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  console.log("result", parsedResult);

  return parsedResult;
}

async function handleRetries({ userPrompt, systemPrompt }) {
  for (let retryCount = 0; retryCount < RETRY_LIMIT; retryCount++) {
    try {
      const ggOpenaiApiKeyJson = process.env.GG_OPENAI__API_KEY_JSON;
      const ggOpenaiApiKey = JSON.parse(ggOpenaiApiKeyJson).key;
      const gptService = new GptService(ggOpenaiApiKey);

      const translatedParagraph = await gptService.getApiResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return translatedParagraph;
    } catch (error) {
      if (retryCount === RETRY_LIMIT - 1) {
        // Si es el último intento
        return { error }; // Devuelve el error
      }
    }
  }
}

export { translateParagraph };
