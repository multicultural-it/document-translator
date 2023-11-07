import {
  getDocxContent,
  buildTranslatedDocxContent,
  getDocumentObjectFromDocxContent,
  getZipContent,
  saveTranslatedDocxContent,
} from "../utils/utils.js";
import { translateAllNodes } from "./translate-all-nodes.js";
import { translateImproveParagraph } from "./translate-improve-paragraph.js";

function getNodeText(node) {
  if (Array.isArray(node)) {
    if (node[0]._ !== undefined) {
      return node[0]._;
    }
    if (node[0] !== undefined) {
      return node[0];
    }

    return null;
  }
}

async function translateDocx({
  docxContent,
  sourceLanguage,
  targetLanguage,
  progressCallback,
}) {
  const documentObj = await getDocumentObjectFromDocxContent(docxContent);
  const nodes = findTextNodes(documentObj["w:document"]["w:body"][0]);

  const originalNodes = nodes
    .map((node, indexNode) => ({
      index: indexNode + 1,
      text: getNodeText(node),
      node,
    }))
    .filter(
      node =>
        node.text !== null &&
        node.text !== undefined &&
        node.text.trim().length > 0
    );

  const plainDocument = {
    nodes: originalNodes.map(node => ({
      index: node.index,
      text: node.text,
    })),
    plainDocument: originalNodes.map(node => node.text).join(""), // For the moment, we dont take account breaks lines
  };

  const translatedNodes = await translateAllNodes({
    plainDocument,
    sourceLanguage,
    targetLanguage,
  });

  replaceAllTranslatedNodes({
    originalNodes,
    translatedNodes: translatedNodes.nodes,
  });

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  return translatedDocxContent;
}

function replaceAllTranslatedNodes({ originalNodes, translatedNodes }) {
  console.log("originalNodes", JSON.stringify(originalNodes, null, 2));
  console.log("translatedNodes", JSON.stringify(translatedNodes, null, 2));
  originalNodes.forEach((originalNode, originalIndex) => {
    const translatedNode = translatedNodes.find(
      translatedNode => translatedNode.index === originalIndex + 1
    );

    if (translatedNode !== undefined) {
      if (Array.isArray(originalNode.node)) {
        if (originalNode.node[0]._ !== undefined) {
          // log all
          // console.log("opcion 1");
          // console.log("originalNode", originalNode);
          // console.log("translatedNode", translatedNode);
          originalNode.node[0]._ = translatedNode.translation;
        } else {
          // console.log("opcion 2");
          // console.log("originalNode", originalNode);
          // console.log("translatedNode", translatedNode);
          originalNode.node[0] = translatedNode.translation;
        }
      }
    }
  });
}

function findParagraphNodes(node) {
  const paragraphs = [];

  function traverse(currentNode) {
    if (!currentNode || typeof currentNode !== "object") return;

    if (currentNode["w:pPr"]) {
      paragraphs.push(currentNode);
      return;
    }
    if (currentNode["w:p"]) {
      // paragraphs.push(currentNode["w:p"]);
      paragraphs.push(currentNode);
      return;
    }
    Object.values(currentNode).forEach(child => traverse(child));
  }

  traverse(node);

  return paragraphs;
}

function findTextNodes(node) {
  function traverse(currentNode) {
    if (!currentNode || typeof currentNode !== "object") return [];
    if (currentNode["w:t"]) return [currentNode["w:t"]];
    return Object.values(currentNode).flatMap(child => traverse(child));
  }
  return traverse(node);
}

function getTextFromParagraph(paragraphNode) {
  const textNodes = findTextNodes(paragraphNode);
  const result = textNodes
    .map(node => {
      if (Array.isArray(node)) {
        if (node[0]._ !== undefined) {
          return node[0]._;
        }
        return node[0];
      } else {
        if (node._ !== undefined) {
          return node._;
        }
        return node;
      }
    })
    .join("");
  return result;
}

async function translateDocxLocal(inputPath, outputPath) {
  const docxContent = await getDocxContent(inputPath);

  const translatedDocxContent = await translateDocx({
    docxContent,
    sourceLanguage: "English",
    targetLanguage: "Spanish (Argentina)",
    progressCallback: progress => {
      console.log("calcular progress aqui");
    },
  });
  saveTranslatedDocxContent(outputPath, translatedDocxContent);
}

export { translateDocx, translateDocxLocal, getZipContent };
