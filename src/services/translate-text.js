import {
  cleanText,
  hasTranslationErrors,
  shouldRetry,
} from "../utils/utils.js";
import GptService from "./gpt-service.js";

const retryLimit = 3;
let translationCallCount = 0;
const currentLanguage = process.argv[2] || "Spanish";

// Out: <!" Establecieron el campamento cerca de la orilla. "!>
// Out: <!" لقد أقاموا المخيم بالقرب من الضفة. "!>

const userPromptTemplate = `Ensure an accurate and culturally appropriate translation for ${currentLanguage} speakers. The translation should be solely of the Current Node, while considering adjacent text nodes (Previous Node and Next Node) for context to ensure accuracy and appropriateness in the translation. Adjacent text nodes should not be translated; they are only to be used as context to aid in translating the Current Node accurately and culturally appropriately. The examples provided are from English to Spanish simply to illustrate the expected format; translations can be requested into different target languages as well. Retain an engaging tone.
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

const systemPrompt = `You're a skilled ${currentLanguage} translator. Your task is to translate solely the Current Node into accurate and culturally appropriate ${currentLanguage}, considering adjacent text nodes (Previous Node and Next Node) for context to ensure the accuracy and appropriateness of your translation. Do not translate the adjacent text nodes; they should only be used as context to assist in translating the Current Node. The examples provided earlier illustrate translations from English to Spanish only to demonstrate the expected format, but be prepared to translate into various target languages as needed. Ensure your translation and format are clean and engaging.`;

function generateUserPrompt(chunk, leftChunk, rightChunk) {
  return userPromptTemplate
    .replace("{currentNode}", chunk)
    .replace("{previousNode}", leftChunk || "N/A")
    .replace("{nextNode}", rightChunk || "N/A");
}

async function translateChunk(chunk, leftChunk, rightChunk) {
  const userPrompt = generateUserPrompt(chunk, leftChunk, rightChunk);
  return await handleRetries(userPrompt, chunk);
}

async function handleRetries(userPrompt, chunk) {
  console.log("Intento de traduccion: ", translationCallCount);

  for (let retryCount = 0; retryCount < retryLimit; retryCount++) {
    try {
      let translatedChunk = await getApiResponse(userPrompt);
      translatedChunk = cleanText(translatedChunk);

      console.log("TRADUCCION: ", translatedChunk);
      if (
        !hasTranslationErrors(translatedChunk) ||
        !shouldRetry(translatedChunk, retryCount, retryLimit)
      ) {
        return translatedChunk || chunk;
      }
    } catch (error) {
      console.error(error);
    }
  }
  return chunk;
}

async function getApiResponse(userPrompt) {
  const gptService = new GptService(process.env.OPENAI_API_KEY);
  return await gptService.getApiResponse([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

async function translateText({ chunk, leftChunk, rightChunk }) {
  translationCallCount += 1;
  const translatedChunk = await translateChunk(chunk, leftChunk, rightChunk);
  return translatedChunk.replace(/"/g, "");
}

export { translateText };
