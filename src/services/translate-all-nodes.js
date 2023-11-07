import GptService from "./gpt-service.js";

const RETRY_LIMIT = 3;

const SYSTEM_PROMPT = `Como experto en generar traducciones coherentes y culturalmente apropiadas del inglés al español (Argentina), al trabajar con nodos de documentos debes:

- Mantener con precisión el orden proporcionado de los nodos basándote en sus índices. Bajo ninguna condición deben los nodos ser reordenados.
- Enfocar cada traducción de nodo en mantener el contexto y el significado del texto original. Es esencial que, al unir los nodos traducidos, el texto en su conjunto fluya de manera lógica y natural en español, utilizando formas de hablar idiomáticas y una sintaxis adecuada para preservar la coherencia y la fluidez del texto.
- Asegurarte de escapar adecuadamente todos los caracteres especiales, como comillas dobles y simples y otros signos de puntuación, para que cumplan con el formato necesario para la función JSON.parse().
- Tu meta es producir traducciones precisas y culturalmente relevantes que se integren sin problemas dentro de la estructura del documento original, manteniendo una correspondencia exacta con el orden basado en los índices. Cuando te enfrentes a construcciones lingüísticas complejas o frases que no traducen de forma directa, deberás adaptar la traducción en cada nodo de acuerdo con el idioma meta para asegurar que la secuencia de nodos conjugue un mensaje coherente y entendible.

Recuerda que el objetivo primordial es que la traducción resultante, vista como un todo, sea fluida y natural en español, sin perder la lealtad al mensaje original. La claridad, la coherencia, y la integridad del contenido son los pilares que deben guiar tu traducción. Prioriza siempre la naturalidad del idioma destino y la fidelidad con el texto fuente.
`;

const USER_PROMPT_TEMPLATE = `Como experto en crear traducciones coherentes y culturalmente apropiadas del inglés al español (Argentina) al trabajar con los nodos de un documento, debes:

- Mantener estrictamente el orden original de los nodos siguiendo sus índices asignados. No se permite reorganizar los nodos bajo ninguna circunstancia.
- Realizar la traducción con especial atención al contexto global del documento. Cada nodo debe ser entendido como parte de un texto continuo para asegurar que la traducción resultante sea fluida y natural al ser leída en conjunto.
- Revisar y ajustar la estructura gramatical y las elecciones léxicas de cada nodo para garantizar una concatenación fluida del texto traducido. En casos donde una traducción literal de un nodo no genere coherencia al ser concatenado, como en los nodos 2 y 3, utiliza expresiones idiomáticas y reestructuraciones que mantengan la esencia y significado del original.
- Asegúrate de escapar correctamente todos los caracteres especiales, como comillas y apóstrofes, para garantizar la compatibilidad con JSON.parse().
- Recuerda que el objetivo final es producir traducciones claras y culturalmente relevantes que se integren directamente en la estructura del documento, conservando el orden exacto de los nodos basado en los índices asignados.


Example:
Input:
{
  "plainDocument": "This course can help you better understand LinkedIn Marketing Solutions’ paid products. So, if you’re a marketer, salesperson, or agency, this course can help you.",
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
  "plainDocument": "Este curso puede ayudarlo a \\"comprender\\" mejor los productos pagos de LinkedIn Marketing Solutions. Por lo tanto, si eres un comercializador, vendedor o agencia, este curso puede ayudarte.",
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
    "plainDocument": "{plainDocument}",
    "nodes": [{nodes}]
}
Output:

`;

function generateUserPrompt({ plainDocument, sourceLanguage, targetLanguage }) {
  let nodesString = JSON.stringify(plainDocument.nodes, null, 2);

  return USER_PROMPT_TEMPLATE.replace(
    "{plainDocument}",
    plainDocument.plainDocument
  )
    .replace("{nodes}", nodesString)
    .replace(
      "{sourceLanguage}",
      sourceLanguage === "Detect language"
        ? "the auto-identified source language"
        : sourceLanguage
    )
    .replace("{targetLanguage}", targetLanguage);
}

function generateSystemPrompt({ sourceLanguage, targetLanguage }) {
  return SYSTEM_PROMPT.replace(
    "{sourceLanguage}",
    sourceLanguage === "Detect language"
      ? "the auto-identified source language"
      : sourceLanguage
  ).replace("{targetLanguage}", targetLanguage);
}

async function translateAllNodes({
  plainDocument,
  sourceLanguage,
  targetLanguage,
}) {
  const userPrompt = generateUserPrompt({
    plainDocument,
    sourceLanguage,
    targetLanguage,
  });

  const systemPrompt = generateSystemPrompt({ sourceLanguage, targetLanguage });

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

  return parsedResult;
}

async function handleRetries({ userPrompt, systemPrompt }) {
  for (let retryCount = 0; retryCount < RETRY_LIMIT; retryCount++) {
    try {
      // const gptService = new GptService(process.env.OPENAI_API_KEY);
      const gptService = new GptService(process.env.GG_OPENAI__API_KEY);

      const translatedNodes = await gptService.getApiResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return translatedNodes;
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

export { translateAllNodes };
