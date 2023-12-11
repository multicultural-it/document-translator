import { translateDocx } from "../services/translate-docx.js";
import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";

export function cleanJson(text) {
  showLog("Limpiando el json...");

  let newText;
  newText = text.replace(/```json\n{\n/g, "{");
  newText = text.replace(/```json\n{/g, "{");
  newText = text.replace(/```json/g, "");

  // Verificar si el último carácter es diferente de }
  if (newText[newText.length - 1] !== "}") {
    // Encontrar la posición del último } en el texto
    const lastCurlyBraceIndex = newText.lastIndexOf("}");
    // Cortar el texto hasta esa posición
    if (lastCurlyBraceIndex !== -1) {
      newText = newText.substring(0, lastCurlyBraceIndex + 1);
    }
  }
  showLog("Json limpiado.");

  return newText;
}

export function cleanText(text) {
  showLog("Limpiando el texto del nodo...");
  let newText = text.replace(/<!"|"!>/g, "");
  newText = newText.replace(/Current Node:|Next Node:/g, "");
  newText = newText.replace(/Out:/g, "");

  newText = newText.replace(/```json/g, "");
  // Verificar si el último carácter es diferente de }
  if (newText[newText.length - 1] !== "}") {
    // Encontrar la posición del último } en el texto
    const lastCurlyBraceIndex = newText.lastIndexOf("}");
    // Cortar el texto hasta esa posición
    if (lastCurlyBraceIndex !== -1) {
      newText = newText.substring(0, lastCurlyBraceIndex + 1);
    }
  }
  showLog("Texto limpiado.");

  return text.replace(/<!"|"!>/g, "");
}

export function isValidChunk(chunk, index) {
  showLog(`Validando el fragmento ${index + 1}...`);
  const trimmedChunk = chunk.trim();

  const percentageRegex = /^\d+%$/;
  const multiplierRegex = /^\d+x$/;
  const singleCharRegex = /^.$/;
  const urlRegex =
    /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:\/~+#-]*[\w@?^=%&/~+#-])?$/;

  if (
    urlRegex.test(trimmedChunk) ||
    percentageRegex.test(trimmedChunk) ||
    multiplierRegex.test(trimmedChunk) ||
    singleCharRegex.test(trimmedChunk)
  ) {
    showLog(
      `Chunk ${
        index + 1
      } is a URL, percentage, multiplier, or single character. Using original text.`
    );
    showLog(`El fragmento ${index + 1} no es válido para la traducción.`);
    return false;
  }
  showLog(`El fragmento ${index + 1} es válido para la traducción.`);
  return true;
}

async function getDocxContent(inputPath) {
  showLog(`Leyendo el archivo DOCX desde '${inputPath}'...`);

  const content = fs.readFileSync(inputPath);

  const zip = new JSZip();
  await zip.loadAsync(content);
  return zip;
}

// Blob to zip
export async function getZipContent(blob) {
  const content = await blob.arrayBuffer();
  const zip = new JSZip();
  await zip.loadAsync(content);
  return zip;
}

export function chunkArray(myArray, chunk_size) {
  const cloneMyArray = [...myArray];
  let results = [];
  while (cloneMyArray.length) {
    results.push(cloneMyArray.splice(0, chunk_size));
  }
  return results;
}

export async function getDocumentObjectFromDocxContent(zipContent) {
  const documentXml = await zipContent
    .file("word/document.xml")
    .async("string");
  return new xml2js.Parser().parseStringPromise(documentXml);
}

export async function buildTranslatedDocxContent(documentObj, zipContent) {
  const translatedDocumentXml = new xml2js.Builder().buildObject(documentObj);
  return zipContent
    .file("word/document.xml", translatedDocumentXml)
    .generateAsync({ type: "nodebuffer" });
}

export function saveTranslatedDocxContent(outputPath, translatedDocxContent) {
  fs.writeFileSync(outputPath, translatedDocxContent);
}

export function getChunkFromNode(node) {
  // return node?._ || "";
  return node?._ || node;
}

export async function translateDocxLocal(inputPath, outputPath) {
  showLog(
    `Iniciando la traducción del archivo DOCX desde '${inputPath}' hacia '${outputPath}'...`
  );
  const docxContent = await getDocxContent(inputPath);

  const translatedDocxContent = await translateDocx({
    docxContent,
    sourceLanguage: "Detect language",
    // targetLanguage: "Chinese (Simplified)",
    targetLanguage: "Spanish (Argentina)",
    progressCallback: progress => {
      // showLog("Progress: ", progress);
    },
  });
  showLog("Traducción completada. Guardando el archivo traducido...");
  saveTranslatedDocxContent(outputPath, translatedDocxContent);
  showLog("Archivo traducido guardado exitosamente.");
}

export function updateTextNode(node, translation) {
  showLog("Actualizando el nodo de texto con la traducción...");

  const textContent = node["w:t"][0];
  if (textContent && textContent._) {
    textContent._ = translation;
  } else if (textContent && typeof textContent === "string") {
    node["w:t"][0] = translation;
  } else {
    showLog("Text content is missing or null");
  }
  showLog("Nodo de texto actualizado.");
}

const showLog = (message, ...optionalParams) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...optionalParams);
  }
};

// import { translateDocx } from "../services/translate-docx.js";
// import fs from "fs";
// import JSZip from "jszip";
// import xml2js from "xml2js";

// export function cleanText(text) {
//   let newText = text.replace(/<!"|"!>/g, "");
//   newText = newText.replace(/Current Node:|Next Node:/g, "");

//   newText = newText.replace(/Out:/g, "");
//   return text.replace(/<!"|"!>/g, "");
// }

// export function isValidChunk(chunk, index) {
//   const trimmedChunk = chunk.trim();
//   const percentageRegex = /^\d+%$/;
//   const multiplierRegex = /^\d+x$/;
//   const singleCharRegex = /^.$/;
//   const urlRegex =
//     /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:\/~+#-]*[\w@?^=%&/~+#-])?$/;

//   if (
//     urlRegex.test(trimmedChunk) ||
//     percentageRegex.test(trimmedChunk) ||
//     multiplierRegex.test(trimmedChunk) ||
//     singleCharRegex.test(trimmedChunk)
//   ) {
//     showLog(
//       `Chunk ${
//         index + 1
//       } is a URL, percentage, multiplier, or single character. Using original text.`
//     );
//     return false;
//   }
//   return true;
// }

// async function getDocxContent(inputPath) {
//   const content = fs.readFileSync(inputPath);

//   const zip = new JSZip();
//   await zip.loadAsync(content);
//   return zip;
// }

// // Blob to zip
// export async function getZipContent(blob) {
//   const content = await blob.arrayBuffer();
//   const zip = new JSZip();
//   await zip.loadAsync(content);
//   return zip;
// }

// export function chunkArray(myArray, chunk_size) {
//   const cloneMyArray = [...myArray];
//   let results = [];
//   while (cloneMyArray.length) {
//     results.push(cloneMyArray.splice(0, chunk_size));
//   }
//   return results;
// }

// export async function getDocumentObjectFromDocxContent(zipContent) {
//   const documentXml = await zipContent
//     .file("word/document.xml")
//     .async("string");
//   return new xml2js.Parser().parseStringPromise(documentXml);
// }

// export async function buildTranslatedDocxContent(documentObj, zipContent) {
//   const translatedDocumentXml = new xml2js.Builder().buildObject(documentObj);
//   return zipContent
//     .file("word/document.xml", translatedDocumentXml)
//     .generateAsync({ type: "nodebuffer" });
// }

// export function saveTranslatedDocxContent(outputPath, translatedDocxContent) {
//   fs.writeFileSync(outputPath, translatedDocxContent);
// }

// export function getChunkFromNode(node) {
//   // return node?._ || "";
//   return node?._ || node;
// }

// export async function translateDocxLocal(inputPath, outputPath) {
//   const docxContent = await getDocxContent(inputPath);

//   const translatedDocxContent = await translateDocx({
//     docxContent,
//     sourceLanguage: "Detect language",
//     // targetLanguage: "Chinese (Simplified)",
//     targetLanguage: "Spanish (Argentina)",
//     progressCallback: progress => {
//       showLog("calcular progress aqui");
//     },
//   });
//   saveTranslatedDocxContent(outputPath, translatedDocxContent);
// }

// export function updateTextNode(node, translation) {
//   const textContent = node["w:t"][0];
//   if (textContent && textContent._) {
//     textContent._ = translation;
//   } else if (textContent && typeof textContent === "string") {
//     node["w:t"][0] = translation;
//   } else {
//     showLog("Text content is missing or null");
//   }
// }

////////////////////////////////////////////////////////////////////////////////////////////////

export function shouldRetry(translatedChunk, retryCount, retryLimit) {
  let shouldRetry = false;
  const lowerCaseChunk = translatedChunk.toLowerCase();
  const errorKeywords = [
    "misunderstanding",
    "sorry",
    "please",
    "apologie",
    "unable",
    "error",
    "provide",
    "assistant",
    "Out:",
    "Current Node:",
    "Next Node:",
  ];
  const arabicErrorKeywords = [
    "سوء فهم",
    "هل يمكن أن تقدم",
    "عذراً",
    "من فضلك",
    "اعتذار",
    "اعتذارات",
    "غير قادر",
    "يمد",
    "خطأ",
  ];

  if (
    errorKeywords.some(word => lowerCaseChunk.includes(word)) ||
    arabicErrorKeywords.some(word => translatedChunk.includes(word))
  ) {
    if (retryCount < retryLimit - 1) {
      shouldRetry =
        lowerCaseChunk.includes("Out:") ||
        lowerCaseChunk.includes("Next Node") ||
        lowerCaseChunk.includes("Current Node");
    } else {
      shouldRetry = lowerCaseChunk.includes("Out:");
    }
  }

  return shouldRetry;
}

export function hasTranslationErrors(translatedChunk) {
  const lowerCaseChunk = translatedChunk.toLowerCase();
  const errorKeywords = [
    "misunderstanding",
    "sorry",
    "please",
    "apologie",
    "unable",
    "error",
    "provide",
    "assistant",
  ];
  const arabicErrorKeywords = [
    "سوء فهم",
    "هل يمكن أن تقدم",
    "عذراً",
    "من فضلك",
    "اعتذار",
    "اعتذارات",
    "غير قادر",
    "يمد",
    "خطأ",
  ];

  // Retorna `true` si encuentra alguna de las palabras clave de error, tanto en inglés como en árabe
  return (
    errorKeywords.some(word => lowerCaseChunk.includes(word)) ||
    arabicErrorKeywords.some(word => translatedChunk.includes(word))
  );
}

////////////////////////////////////////////////////////////////////////////////////////////////

export const languageMap = {
  English: {
    inExample: `Snapchat es una plataforma para autoexpresión con imágenes y videos.`,
    outExample: `Snapchat is a platform for self-expression through images and videos.`,
  },
  Spanish: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat es una plataforma para autoexpresión con imágenes y videos.`,
  },
  French: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat est une plateforme pour l'auto-expression à travers des images et des vidéos.`,
  },
  German: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat ist eine Plattform zur Selbstausdruck durch Bilder und Videos.`,
  },
  Italian: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat è una piattaforma per autoespressione con immagini e video.`,
  },
  Portuguese: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat é uma plataforma para autoexpressão com imagens e vídeos.`,
  },
  Russian: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat - платформа для самовыражения с помощью изображений и видео.`,
  },
  Arabic: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `سناب شات منصة للتعبير عن النفس بالصور والفيديوهات.`,
  },
  Chinese: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat是一个通过图片和视频进行自我表达的平台。`,
  },
  Japanese: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchatは、画像や動画を通じて自己表現をするプラットフォームです。`,
  },
};

// export function updateTextNode(node, translation) {
//   const textContent = node["w:t"][0];
//   if (textContent) {
//     textContent._ = translation;
//   } else {
//     showLog("Text content is missing or null");
//   }
// }

// EASTE SI ANDA
// "w:t": [
//   {
//     "_": "Please visit ",
//     "$": {
//       "xml:space": "preserve"
//     }
//   }
// ]
// ESTE NO ANDA:
// "w:t": [
//   "Please choose the button: “"
// ]

// // clone node
// const cloneNode = JSON.parse(JSON.stringify(node));
// // update node
// cloneNode["w:t"][0] = translation;
// // replace node
// node = cloneNode;
