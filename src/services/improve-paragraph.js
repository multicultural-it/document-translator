import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const SYSTEM_PROMPT = `You are a specialist in assembling coherent translations using node translations. The target language is {targetLanguage}. When given an original paragraph and an array of nodes with their original text, their translations, and indices, your task is to construct a coherent translated paragraph. If the concatenated node translations don't make sense or don't match the paragraph's meaning, you should rearrange the nodes and adjust the translations if needed. The final translated paragraph should be coherent and maintain the original paragraph's context and meaning. Ensure to keep the nodes in a specific order, defined by their indices, so that when concatenated, they form a logical and meaningful translation.`;

const USER_PROMPT_TEMPLATE = `Given a paragraph and its node original text and translations, ensure that the concatenated node translations provide a coherent translation of the entire paragraph. If the current order of nodes doesn't produce a clear translation, rearrange the nodes and adjust the translations accordingly. The target language is {targetLanguage}.
The example below illustrates how you should proceed. Ensure the resulting paragraph maintains the original context and meaning.

Example:
Input:
{
"paragraph": "This course can help you better understand LinkedIn Marketing Solutions’ paid products.",
"nodes": [
{
"index": 0,
"original": "This course can help you better understand ",
"translation": "Este curso puede ayudarlo a comprender mejor"
},
{
"index": 1,
"original": "LinkedIn Marketing Solutions",
"translation": "LinkedIn Marketing Solutions"
},
{
"index": 2,
"original": "’ paid products.",
"translation": "los productos pagos."
}
]
}
Output:
{
"paragraph": "Este curso puede ayudarlo a comprender mejor los productos pagos de LinkedIn Marketing Solutions.",
"nodes": [
{
"index": 1,
"translation": "Este curso puede ayudarlo a comprender mejor "
},
{
"index": 3,
"translation": "los productos pagos "
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

  console.log("userPrompt", userPrompt);
  console.log("systemPrompt", systemPrompt);

  const result = await handleRetries({
    userPrompt,
    systemPrompt,
    paragraph,
  });

  console.log("result", result);

  return JSON.parse(result);
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

export { improveParagraph };
