import { cleanJson } from "../utils/utils.js";
import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const SYSTEM_PROMPT = `You are a specialist in assembling coherent translations using node translations and ensuring cultural appropriateness. The source language is {sourceLanguage} and the target language is {targetLanguage}. When given an original paragraph and an array of nodes with their original text, and indices, your primary task is to construct a coherent translated paragraph. If the concatenated node translations don't make sense or don't match the paragraph's meaning, rearrange the nodes and adjust the translations if needed. Ensure to keep the nodes in a specific order, defined by their indices. Furthermore, make sure your translations are clear, engaging, and culturally appropriate. Remember to escape special characters like quotes and apostrophes. Keep in mind that your response will be processed using the JSON.parse() function.`;

const USER_PROMPT_TEMPLATE = `Given a paragraph and its node original text and translations, your primary task is to ensure that the concatenated node translations provide a coherent and culturally appropriate translation of the entire paragraph from {sourceLanguage} to {targetLanguage}. If the current order of nodes doesn't produce a clear translation, rearrange the nodes and adjust the translations accordingly. Ensure the resulting paragraph maintains the original context, meaning, and cultural nuances. Remember to escape special characters like quotes and apostrophes, and be aware that your response will be processed using the JSON.parse() function. The example below is provided to guide the structure of the response, regardless of the source and target languages presented. Your focus should be on the quality and coherence of the translation.

Example:
Input:
{
  "paragraph": "This course can help you better understand LinkedIn Marketing Solutions’ paid products. So, if you’re a marketer, salesperson, or agency, this course can help you.",
  "nodes": [
    {
      "index": 1,
      "text": "This course can help you better "understand" "
    },
    {
      "index": 2,
      "text": "LinkedIn Marketing Solutions"
    },
    {
      "index": 3,
      "text": "’ paid products. So, if you’re a marketer, salesperson, or agency, this course can help you."
    }
  ]
}
Output:
{
  "paragraph": "Este curso puede ayudarlo a \\"comprender\\" mejor los productos pagos de LinkedIn Marketing Solutions. Por lo tanto, si eres un comercializador, vendedor o agencia, este curso puede ayudarte.",
  "nodes": [
    {
      "index": 1,
      "translation": "Este curso puede ayudarlo a \\"comprender\\" mejor los productos pagos de "
    },
    {
      "index": 2,
      "translation": "LinkedIn Marketing Solutions"
    },
    {
      "index": 3,
      "translation": ". Por lo tanto, si eres un comercializador, vendedor o agencia, este curso puede ayudarte."
    }
  ]
}

Input: 
{
    "paragraph": "{paragraph}",
    "nodes": {nodes}
}
Output:

`;

function generateUserPrompt({ paragraph, sourceLanguage, targetLanguage }) {
  let nodesString = JSON.stringify(paragraph.nodes, null, 2);

  return (
    USER_PROMPT_TEMPLATE.replace("{paragraph}", paragraph.paragraph)
      .replace("{nodes}", nodesString)
      // .replace("{sourceLanguage}", sourceLanguage)
      .replace(
        "{sourceLanguage}",
        sourceLanguage === "Detect language"
          ? "the auto-identified source language"
          : sourceLanguage
      )
      .replace("{targetLanguage}", targetLanguage)
  );
}

function generateSystemPrompt({ sourceLanguage, targetLanguage }) {
  return SYSTEM_PROMPT.replace(
    "{sourceLanguage}",
    sourceLanguage === "Detect language"
      ? "the auto-identified source language"
      : sourceLanguage
  ).replace("{targetLanguage}", targetLanguage);
}

async function translateImproveParagraph({
  paragraph,
  sourceLanguage,
  targetLanguage,
  progressCallback,
  paragraphCount,
}) {
  const userPrompt = generateUserPrompt({
    paragraph,
    sourceLanguage,
    targetLanguage,
  });

  const systemPrompt = generateSystemPrompt({ sourceLanguage, targetLanguage });

  let result;
  let parsedResult;

  // if paragraph lenght is 0, return same paragraph
  if (paragraph.paragraph.length === 0) {
    // log llamativo
    console.log("##############");
    console.log("PARAGRAPH LENGTH IS 0");
    console.log("##############");
    return paragraph;
  }

  while (true) {
    result = await handleRetries({
      userPrompt,
      systemPrompt,
    });

    try {
      const cleanResult = cleanJson(result);
      parsedResult = JSON.parse(cleanResult);

      // termina la traduccion del parrafo. se suma un progreso. para esto se usa una funcion callback que viene desde monorepo
      await progressCallback({ result, paragraphCount });

      // log
      // console.log("########");
      // console.log("result", result);
      // console.log("paragraphCount", paragraphCount);

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

export { translateImproveParagraph };
