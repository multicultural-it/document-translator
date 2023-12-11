import { cleanJson } from "../utils/utils.js";
import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const SYSTEM_PROMPT = `You are a specialist in assembling coherent translations using node translations. The target language is {targetLanguage}. When given an original paragraph and an array of nodes with their original text, their translations, and indices, your task is to construct a coherent translated paragraph. If the concatenated node translations don't make sense or don't match the paragraph's meaning, you should rearrange the nodes and adjust the translations if needed. The final translated paragraph should be coherent and maintain the original paragraph's context and meaning. Ensure to keep the nodes in a specific order, defined by their indices, so that when concatenated, they form a logical and meaningful translation. Remember scape special characters like quotes and apostrophes. Take account that your responde will be procceded un JSON.parse() function.`;

const USER_PROMPT_TEMPLATE = `Given a paragraph and its node original text and translations, ensure that the concatenated node translations provide a coherent translation of the entire paragraph. If the current order of nodes doesn't produce a clear translation, rearrange the nodes and adjust the translations accordingly. The target language is {targetLanguage}. Remember scape special characters like quotes and apostrophes. Take account that your responde will be procceded un JSON.parse() function.
The example below illustrates how you should proceed. Ensure the resulting paragraph maintains the original context and meaning.

Example:
Input:
{
  "paragraph": "This course can help you better understand LinkedIn Marketing Solutions’ paid products.",
  "nodes": [
    {
      "index": 1,
      "original": "This course can help you better "understand" ",
      "translation": "Este curso puede ayudarlo a comprender mejor"
    },
    {
      "index": 2,
      "original": "LinkedIn Marketing Solutions",
      "translation": "LinkedIn Marketing Solutions"
    },
    {
      "index": 3,
      "original": "’ paid products.",
      "translation": "los productos pagos."
    }
  ]
}
Output:
{
  "paragraph": "Este curso puede ayudarlo a \\"comprender\\" mejor los productos pagos de LinkedIn Marketing Solutions.",
  "nodes": [
    {
      "index": 1,
      "translation": "Este curso puede ayudarlo a \\"comprender\\" mejor "
    },
    {
      "index": 3,
      "translation": "los productos pagos  "
    },
    {
      "index": 2,
      "translation": "de LinkedIn Marketing Solutions."
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

function generateSystemPrompt({ targetLanguage }) {
  return SYSTEM_PROMPT.replace("{targetLanguage}", targetLanguage);
}

async function improveParagraph({ paragraph, targetLanguage }) {
  const userPrompt = generateUserPrompt({
    paragraph,
    targetLanguage,
  });

  const systemPrompt = generateSystemPrompt({ targetLanguage });

  let result;
  let parsedResult;

  while (true) {
    result = await handleRetries({
      userPrompt,
      systemPrompt,
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
      console.error("HANDLE RETRIES ERROR: ", error);
      console.log("userPrompt", userPrompt);
      console.log("systemPrompt", systemPrompt);
      console.error("FIN HANDLE RETRIES ERROR: ", error);
      if (retryCount === RETRY_LIMIT - 1) {
        // Si es el último intento
        return { error }; // Devuelve el error
      }
    }
  }
}

export { improveParagraph };
