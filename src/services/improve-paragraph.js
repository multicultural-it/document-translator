import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const SYSTEM_PROMPT = `You are a specialist in assembling coherent translations using node translations. When given an original paragraph and an array of nodes with their translations and indices, your task is to construct a coherent translated paragraph. If the concatenated node translations don't make sense or don't match the paragraph's meaning, you should rearrange the nodes and adjust the translations if needed. The final translated paragraph should be coherent and maintain the original paragraph's context and meaning. Ensure to keep the nodes in a specific order, defined by their indices, so that when concatenated, they form a logical and meaningful translation.`;

const USER_PROMPT_TEMPLATE = `Given a paragraph and its node translations, ensure that the concatenated node translations provide a coherent translation of the entire paragraph. If the current order of nodes doesn't produce a clear translation, rearrange the nodes and adjust the translations accordingly. The example below illustrates how you should proceed. Ensure the resulting paragraph maintains the original context and meaning.

Example:
Input:
{
"paragraph": "This course can help you better understand LinkedIn Marketing Solutions’ paid products.",
"nodes": [
{
"index": 0,
"translation": "Este curso puede ayudarlo a comprender mejor"
"original": "This course can help you better understand ",
},
{
"index": 1,
"translation": "LinkedIn Marketing Solutions"
"original": "LinkedIn Marketing Solutions",
},
{
"index": 2,
"translation": "los productos pagos."
"original": "’ paid products.",
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

async function improveParagraph({ paragraph, targetLanguage }) {
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
