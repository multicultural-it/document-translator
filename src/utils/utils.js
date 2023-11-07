import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";

export function cleanText(text) {
  let newText = text.replace(/<!"|"!>/g, "");
  newText = newText.replace(/Current Node:|Next Node:/g, "");

  newText = newText.replace(/Out:/g, "");
  return text.replace(/<!"|"!>/g, "");
}

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

export function isValidChunk(chunk, index) {
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
    console.log(
      `Chunk ${
        index + 1
      } is a URL, percentage, multiplier, or single character. Using original text.`
    );
    return false;
  }
  return true;
}

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

export async function getDocxContent(inputPath) {
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

export function chunkrray(myArray, chunk_size) {
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
  return node?._ || "";
}

////////////////////////////////////////////////////////////

// function replaceOriginalParagraphsNodesWithTranslated({
//   jsonParagraphs,
//   improvedParagraphs,
// }) {
//   jsonParagraphs.forEach((originalParagraph, originalParagraphIndex) => {
//     const translatedParagraph = improvedParagraphs.find(
//       (_, translatedIndex) => translatedIndex === originalParagraphIndex
//     );

//     if (translatedParagraph) {
//       const originalNodes = findTextNodes(originalParagraph.originalNode);

//       originalNodes.forEach((originalNode, auxOriginalIndex) => {
//         const originalIndex = auxOriginalIndex + 1;

//         console.log(
//           `Procesando nodo original con índice ${originalIndex}:`,
//           originalNode
//         );

//         const translatedNode = translatedParagraph.nodes.find(
//           translatedNode => {
//             const translatedIndex = translatedNode.index ?? 1;
//             const isFound = translatedIndex === originalIndex;

//             return isFound;
//           }
//         );

//         if (translatedNode) {
//           console.log(
//             `Nodo traducido encontrado para índice ${originalIndex}:`,
//             translatedNode
//           );
//         } else {
//           console.log(
//             `No se encontró nodo traducido para índice ${originalIndex}`
//           );
//         }

//         if (translatedNode) {
//           if (originalNode["w:t"] && Array.isArray(originalNode["w:t"])) {
//             const clonedNode = JSON.parse(
//               JSON.stringify(originalNode["w:t"][0])
//             );
//             clonedNode._ = translatedNode.translation;

//             if (clonedNode && clonedNode._) {
//               originalNode["w:t"][0] = clonedNode;
//             }
//           }
//           if (originalNode[0] && typeof originalNode[0] === "string") {
//             originalNode[0] = translatedNode.translation;
//           } else {
//             const clonedNode = JSON.parse(JSON.stringify(originalNode[0]));
//             console.log("clonedNode", clonedNode);
//             console.log(
//               "stringify originalNode[0]",
//               JSON.stringify(originalNode[0])
//             );
//             clonedNode._ = translatedNode.translation;

//             if (clonedNode && clonedNode._) {
//               originalNode[0] = clonedNode;
//             }
//           }
//         }
//       });
//     }
//   });
// }
