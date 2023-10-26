import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const SYSTEM_PROMPT = `You are a specialist in assembling coherent translations using node translations and ensuring cultural appropriateness. The target language is {targetLanguage}. When given an original paragraph and an array of nodes with their original text, and indices, your primary task is to construct a coherent translated paragraph. If the concatenated node translations don't make sense or don't match the paragraph's meaning, rearrange the nodes and adjust the translations if needed. Ensure to keep the nodes in a specific order, defined by their indices. Furthermore, make sure your translations are clear, engaging, and culturally appropriate. Remember to escape special characters like quotes and apostrophes. Keep in mind that your response will be processed using the JSON.parse() function.`;

const USER_PROMPT_TEMPLATE = `Given a paragraph and its node original text and translations, your primary task is to ensure that the concatenated node translations provide a coherent and culturally appropriate translation of the entire paragraph. If the current order of nodes doesn't produce a clear translation, rearrange the nodes and adjust the translations accordingly. The translation should resonate with {targetLanguage} speakers. Ensure the resulting paragraph maintains the original context, meaning, and cultural nuances. Remember to escape special characters like quotes and apostrophes, and be aware that your response will be processed using the JSON.parse() function. The example below illustrates how you should proceed. Pay attention to how some texts are changed from one node to another if the indices are changed. That is important if necessary.

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
      "translation": "Este curso puede ayudarlo a \\"comprender\\" mejor "
    },
    {
      "index": 3,
      "translation": "los productos pagos  "
    },
    {
      "index": 2,
      "translation": "de LinkedIn Marketing Solutions. Por lo tanto, si eres un comercializador, vendedor o agencia, este curso puede ayudarte."
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

async function translateImproveParagraph({ paragraph, targetLanguage }) {
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
      parsedResult = JSON.parse(result);
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
      // const gptService = new GptService(process.env.OPENAI_API_KEY);
      const gptService = new GptService(process.env.GG_OPENAI__API_KEY);

      const translatedParagraph = await gptService.getApiResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return translatedParagraph;
    } catch (error) {
      // console.error("HANDLE RETRIES ERROR: ", error);
      // console.log("userPrompt", userPrompt);
      // console.log("systemPrompt", systemPrompt);
      // console.error("FIN HANDLE RETRIES ERROR: ", error);
      if (retryCount === RETRY_LIMIT - 1) {
        // Si es el último intento
        return { error }; // Devuelve el error
      }
    }
  }
}

export { translateImproveParagraph };
