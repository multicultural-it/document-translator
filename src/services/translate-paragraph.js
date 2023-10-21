import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;
const SYSTEM_PROMPT = `You're an expert translator. Your task is to translate both the entire paragraph and each of its individual nodes accurately and culturally appropriately. Each node is an essential part of the paragraph, and it's crucial that the translations of the nodes are coherent with that of the full paragraph. Ensure your translations are clear and engaging.`;

const USER_PROMPT_TEMPLATE = `Ensure an accurate and culturally appropriate translation for {targetLanguage} speakers. The translation should be of both the complete paragraph and each individual node, considering the whole paragraph's context to ensure accuracy and appropriateness in the translation. Maintain an engaging tone.

Example:
Input: 
{
    "paragraph": "This course can help you better understand LinkedIn Marketing Solutions’ paid products.",
    "nodes": [
      {
        "index": 0,
        "text": "This course can help you better understand "
      },
      {
        "index": 1,
        "text": "LinkedIn Marketing Solutions"
      },
      {
        "index": 2,
        "text": "’ paid products."
      }
    ]
  }
Output: 
{
  "paragraph": "Este curso puede ayudarte a entender mejor los productos pagados de LinkedIn Marketing Solutions.",
  "nodes": [
    {
      "index": 0,
      "translation": "Este curso puede ayudarte a entender mejor "
    },
    {
      "index": 1,
      "translation": "LinkedIn Marketing Solutions"
    },
    {
      "index": 2,
      "translation": " los productos pagados."
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

function generateUserPrompt({ paragraph }) {
  let nodesString = JSON.stringify(paragraph.nodes, null, 2);

  return USER_PROMPT_TEMPLATE.replace(
    "{paragraph}",
    paragraph.paragraph
  ).replace("{nodes}", nodesString);
}

function generateSystemPrompt() {
  return SYSTEM_PROMPT;
}

async function translateParagraph({ paragraph }) {
  const userPrompt = generateUserPrompt({
    paragraph,
  });

  const systemPrompt = generateSystemPrompt({ paragraph });

  const result = await handleRetries({
    userPrompt,
    systemPrompt,
    paragraph,
  });

  console.log("result", result);

  return JSON.parse(result);
  // return result;
}

async function handleRetries({ userPrompt, systemPrompt, paragraph }) {
  for (let retryCount = 0; retryCount < RETRY_LIMIT; retryCount++) {
    try {
      const gptService = new GptService(process.env.OPENAI_API_KEY);

      const translatedParagraph = await gptService.getApiResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return translatedParagraph;
    } catch (error) {
      console.error(error);
    }
  }
  return chunk;
}

export { translateParagraph };
