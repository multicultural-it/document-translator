import {
  getDocumentObjectFromDocxContent,
  getChunkFromNode,
  buildTranslatedDocxContent,
  chunkArray,
  updateTextNode,
  getZipContent,
} from "../utils/utils.js";
import { translateImproveParagraph } from "./translate-improve-paragraph.js";

// import clipboardy from "clipboardy";

function findTextNodes(node) {
  function traverse(currentNode) {
    if (!currentNode || typeof currentNode !== "object") return [];
    if (currentNode["w:t"]) return [currentNode];
    return Object.values(currentNode).flatMap(child => traverse(child));
  }
  const result = traverse(node);

  return result;
}

function findParagraphNodes(node) {
  const paragraphs = [];

  function traverse(currentNode) {
    if (!currentNode || typeof currentNode !== "object") return;

    // if (currentNode["w:pPr"] || currentNode["w:p"]) {
    if (currentNode["w:r"]) {
      paragraphs.push(currentNode);
      return;
    }
    Object.values(currentNode).forEach(child => traverse(child));
  }

  traverse(node);

  return paragraphs;
}

function getTextFromParagraph(paragraphNode) {
  const textNodes = findTextNodes(paragraphNode);
  const result = textNodes
    .map(node => getChunkFromNode(node["w:t"][0]))
    .join("");

  return result;
}

function replaceOriginalParagraphsNodesWithTranslated({
  originalParagraphs,
  translatedParagraphs,
}) {
  originalParagraphs.forEach((paragraph, index) => {
    const translatedTextNodes = translatedParagraphs[index]?.nodes;
    if (translatedTextNodes) {
      findTextNodes(paragraph.originalNode).forEach((node, nodeIndex) => {
        const translation = translatedTextNodes.find(
          n => n.index === nodeIndex + 1
        )?.translation;
        if (translation) {
          updateTextNode(node, translation);
        }
      });
    }
  });
}

async function translateDocx({
  docxContent,
  sourceLanguage,
  targetLanguage,
  progressCallback,
}) {
  const documentObj = await getDocumentObjectFromDocxContent(docxContent);
  const paragraphs = findParagraphNodes(documentObj["w:document"]["w:body"][0]);

  const jsonParagraphs = paragraphs.map(node => ({
    originalNode: node,
    paragraph: getTextFromParagraph(node),
    nodes: findTextNodes(node).map((node, nodeIndex) => ({
      index: nodeIndex + 1,
      originalText: node["w:t"][0]?._ || node["w:t"][0],
    })),
  }));

  const CHUNK_SIZE = 12;
  const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);

  const translatedBlocksPromises = blocks.map(block =>
    Promise.all(
      block.map(paragraph =>
        translateImproveParagraph({
          paragraph,
          sourceLanguage,
          targetLanguage,
          progressCallback,
          paragraphCount: blocks.length,
        })
      )
    )
  );

  const translatedBlocks = await Promise.all(translatedBlocksPromises);
  const improvedParagraphs = translatedBlocks.flat();

  replaceOriginalParagraphsNodesWithTranslated({
    originalParagraphs: jsonParagraphs,
    translatedParagraphs: improvedParagraphs,
  });

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  return translatedDocxContent;
}

// async function translateDocx({
//   docxContent,
//   sourceLanguage,
//   targetLanguage,
//   progressCallback,
// }) {
//   const documentObj = await getDocumentObjectFromDocxContent(docxContent);
//   const paragraphs = findParagraphNodes(documentObj["w:document"]["w:body"][0]);

//   const jsonParagraphs = paragraphs.map(node => ({
//     originalNode: node,
//     paragraph: getTextFromParagraph(node),
//     nodes: findTextNodes(node).map((node, nodeIndex) => ({
//       index: nodeIndex + 1,

//       originalText: node["w:t"][0]?._ || node["w:t"][0],
//     })),
//   }));
//   // .filter(paragraph => paragraph.paragraph.length > 0);

//   // const CHUNK_SIZE = 8;
//   const CHUNK_SIZE = 16;
//   const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);

//   let improvedParagraphs = [];

//   for (let block of blocks) {
//     let translatedBlock = await Promise.all(
//       block.map(paragraph =>
//         translateImproveParagraph({
//           paragraph,
//           sourceLanguage,
//           targetLanguage,
//           progressCallback,
//           paragraphCount: blocks.length,
//         })
//       )
//     );

//     improvedParagraphs.push(...translatedBlock);
//   }

//   replaceOriginalParagraphsNodesWithTranslated({
//     originalParagraphs: jsonParagraphs,
//     translatedParagraphs: improvedParagraphs,
//   });

//   const translatedDocxContent = await buildTranslatedDocxContent(
//     documentObj,
//     docxContent
//   );

//   return translatedDocxContent;
// }

export { translateDocx, getZipContent };
