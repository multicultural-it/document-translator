import {
  getDocumentObjectFromDocxContent,
  getChunkFromNode,
  buildTranslatedDocxContent,
  chunkArray,
  updateTextNode,
} from "../utils/utils.js";
import { translateImproveParagraph } from "./translate-improve-paragraph.js";

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

    if (currentNode["w:pPr"]) {
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
    const translation = translatedParagraphs[index];
    if (!translation) {
      return;
    }

    const textNodes = findTextNodes(paragraph.originalNode);
    textNodes.forEach((node, nodeIndex) => {
      const translationNode = translation.nodes.find(
        n => n.index === nodeIndex + 1
      );
      if (translationNode) {
        updateTextNode(node, translationNode.translation);
      }
    });
  });
}

async function translateDocx({
  docxContent,
  sourceLanguage,
  targetLanguage,
  progressCallback,
}) {
  console.log("##################################################");

  const documentObj = await getDocumentObjectFromDocxContent(docxContent);

  const paragraphs = findParagraphNodes(documentObj["w:document"]["w:body"][0]);

  const jsonParagraphs = paragraphs
    .map(node => ({
      originalNode: node,
      paragraph: getTextFromParagraph(node),
      nodes: findTextNodes(node).map((node, nodeIndex) => ({
        index: nodeIndex + 1,
        originalText: node["w:t"][0]._,
      })),
    }))
    .filter(paragraph => paragraph.paragraph.length > 0);

  const CHUNK_SIZE = 8;
  const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);

  let improvedParagraphs = [];

  for (let block of blocks) {
    let translatedBlock = await Promise.all(
      block.map(paragraph =>
        translateImproveParagraph({
          paragraph,
          sourceLanguage,
          targetLanguage,
          progressCallback,
          paragraphCount: blocks.length,
        })
      )
    );

    improvedParagraphs.push(...translatedBlock);
  }

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

export { translateDocx };
