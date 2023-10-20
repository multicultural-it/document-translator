import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateText } from "./translate-text.js";

// Utilidades de Nodo
function getChunkFromNode(node) {
  return node?._ || "";
}

function findTextNodes(node) {
  function traverse(currentNode) {
    if (!currentNode || typeof currentNode !== "object") return [];
    if (currentNode["w:t"]) return [currentNode];
    return Object.values(currentNode).flatMap(child => traverse(child));
  }
  return traverse(node);
}

// Utilidades de Traducción
async function translateTextNode(node, index, allTextNodes) {
  const currentChunk = getChunkFromNode(node);
  const leftChunk = getChunkFromNode(allTextNodes[index - 1]);
  const rightChunk = getChunkFromNode(allTextNodes[index + 1]);

  if (!currentChunk) return { ...node };

  const translatedChunk = await translateText({
    chunk: currentChunk,
    leftChunk,
    rightChunk,
    targetLanguage: "Spanish",
  });

  return { ...node, _: translatedChunk };
}

async function translateAllTextNodes(nodes) {
  return Promise.all(
    nodes.map((node, index) => translateTextNode(node["w:t"][0], index, nodes))
  );
}

function replaceOriginalTextNodesWithTranslated(
  originalNodes,
  translatedNodes
) {
  originalNodes.forEach((originalNode, index) => {
    originalNode["w:t"][0] = translatedNodes[index];
  });
}

// Utilidades DOCX
async function getDocxContent(inputPath) {
  const content = fs.readFileSync(inputPath);
  const zip = new JSZip();
  await zip.loadAsync(content);
  return zip;
}

async function getDocumentObjectFromDocxContent(zipContent) {
  const documentXml = await zipContent
    .file("word/document.xml")
    .async("string");
  return new xml2js.Parser().parseStringPromise(documentXml);
}

async function buildTranslatedDocxContent(documentObj, zipContent) {
  const translatedDocumentXml = new xml2js.Builder().buildObject(documentObj);
  return zipContent
    .file("word/document.xml", translatedDocumentXml)
    .generateAsync({ type: "nodebuffer" });
}

function saveTranslatedDocxContent(outputPath, translatedDocxContent) {
  fs.writeFileSync(outputPath, translatedDocxContent);
}

// Función Principal
async function translateDocx(inputPath, outputPath) {
  const docxContent = await getDocxContent(inputPath);
  const documentObj = await getDocumentObjectFromDocxContent(docxContent);

  const textNodes = findTextNodes(documentObj["w:document"]["w:body"][0]);
  const translatedNodes = await translateAllTextNodes(textNodes);
  replaceOriginalTextNodesWithTranslated(textNodes, translatedNodes);

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  saveTranslatedDocxContent(outputPath, translatedDocxContent);

  console.log(`Traducción completada.`);
}

export { translateDocx };
