import { cleanText, hasTranslationErrors } from "../utils/utils.js";
import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const USER_PROMPT_TEMPLATE = `Ensure an accurate and culturally appropriate translation for {targetLanguage} speakers. The translation should be solely of the Current Node, while considering adjacent text nodes (Previous Node and Next Node) for context to ensure accuracy and appropriateness in the translation. Adjacent text nodes should not be translated; they are only to be used as context to aid in translating the Current Node accurately and culturally appropriately. The examples provided are from English to Spanish simply to illustrate the expected format; translations can be requested into different target languages as well. Retain an engaging tone.
Example:

In:
Current Node: They set up camp near the bank.
Previous Node: The adventurers were on a river expedition.
Next Node: They planned to navigate downstream the next morning.
Out: <!" Establecieron el campamento cerca de la orilla. "!>

In:
Current Node: {currentNode}.
Previous Node: {previousNode}.
Next Node: {nextNode}.
Out: <!"`;

const SYSTEM_PROMPT = `You're a skilled {targetLanguage} translator. Your task is to translate solely the Current Node into accurate and culturally appropriate {targetLanguage}, considering adjacent text nodes (Previous Node and Next Node) for context to ensure the accuracy and appropriateness of your translation. Do not translate the adjacent text nodes; they should only be used as context to assist in translating the Current Node. The examples provided earlier illustrate translations from English to Spanish only to demonstrate the expected format, but be prepared to translate into various target languages as needed. Ensure your translation and format are clean and engaging.`;

function generateUserPrompt({ chunk, leftChunk, rightChunk, targetLanguage }) {
  return USER_PROMPT_TEMPLATE.replace("{currentNode}", chunk)
    .replace("{previousNode}", leftChunk)
    .replace("{nextNode}", rightChunk)
    .replace("{targetLanguage}", targetLanguage);
}

function generateSystemPrompt({ targetLanguage }) {
  return SYSTEM_PROMPT.replace("{targetLanguage}", targetLanguage);
}

async function handleRetries({ userPrompt, systemPrompt, chunk }) {
  for (let retryCount = 0; retryCount < RETRY_LIMIT; retryCount++) {
    try {
      // const gptService = new GptService(process.env.OPENAI_API_KEY);
      const gptService = new GptService(process.env.GG_OPENAI__API_KEY);

      const dirtyTranslatedChunk = await gptService.getApiResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      const translatedChunk = cleanText(dirtyTranslatedChunk);
      console.log("TRADUCCION: ", translatedChunk);

      if (!hasTranslationErrors(translatedChunk)) {
        return translatedChunk || chunk;
      }
    } catch (error) {
      console.error(error);
    }
  }
  return chunk;
}

async function translateText({ chunk, leftChunk, rightChunk, targetLanguage }) {
  const userPrompt = generateUserPrompt({
    chunk,
    leftChunk,
    rightChunk,
    targetLanguage,
  });

  const systemPrompt = generateSystemPrompt({ targetLanguage });
  const translatedChunk = await handleRetries({
    userPrompt,
    systemPrompt,
    chunk,
  });
  return translatedChunk.replace(/"/g, "");
}

export { translateText };
