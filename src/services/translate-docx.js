import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateParagraph } from "./translate-paragraph.js";
import { improveParagraph } from "./improve-paragraph.js";
import { translateImproveParagraph } from "./translate-improve-paragraph.js";

async function getDocxContent(inputPath) {
  const content = fs.readFileSync(inputPath);

  const zip = new JSZip();
  await zip.loadAsync(content);
  return zip;
}

// Blob to zip
async function getZipContent(blob) {
  const content = await blob.arrayBuffer();
  const zip = new JSZip();
  await zip.loadAsync(content);
  return zip;
}

function chunkArray(myArray, chunk_size) {
  const cloneMyArray = [...myArray];
  let results = [];
  while (cloneMyArray.length) {
    results.push(cloneMyArray.splice(0, chunk_size));
  }
  return results;
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

function getChunkFromNode(node) {
  return node?._ || "";
}

////////////////////////////////////////////////////////////

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
  jsonParagraphs,
  improvedParagraphs,
}) {
  jsonParagraphs.forEach((originalParagraph, originalParagraphIndex) => {
    const translatedParagraph = improvedParagraphs.find(
      (_, translatedIndex) => translatedIndex === originalParagraphIndex
    );

    if (translatedParagraph) {
      const originalNodes = findTextNodes(originalParagraph.originalNode);

      originalNodes.forEach((originalNode, auxOriginalIndex) => {
        const originalIndex = auxOriginalIndex + 1;

        const translatedNode = translatedParagraph.nodes.find(
          translatedNode => {
            // console.log(
            //   "translated node: ",
            //   JSON.stringify(translatedNode, null, 2)
            // );

            // console.log("original index: ", originalIndex);
            // console.log("translated index: ", translatedNode.index);

            const translatedIndex = translatedNode.index ?? 1;
            const isFound = translatedIndex === originalIndex;

            return isFound;
          }
        );

        if (translatedNode) {
          const clonedNode = JSON.parse(JSON.stringify(originalNode["w:t"][0]));

          clonedNode._ = translatedNode.translation;

          if (clonedNode && clonedNode._) {
            originalNode["w:t"][0] = clonedNode;
          } else {
            console.log("clonedNode no tiene texto o es nulo");
          }
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

  async function processBlocks({ blocks, fn, progressCallback }) {
    let results = [];
    for (let block of blocks) {
      let translatedBlock = await Promise.all(
        block.map(paragraph =>
          fn({
            paragraph,
            sourceLanguage,
            targetLanguage,
            progressCallback,
            paragraphCount: blocks.length,
          })
        )
      );

      results.push(...translatedBlock);
    }
    return results;
  }

  const CHUNK_SIZE = 8;
  const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);

  const improvedParagraphs = await processBlocks({
    blocks,
    fn: translateImproveParagraph,
    progressCallback,
  });

  console.log("IMPROVED PARAGRAPHS: ", improvedParagraphs);

  replaceOriginalParagraphsNodesWithTranslated({
    jsonParagraphs,
    improvedParagraphs,
  });

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  return translatedDocxContent;
}

async function translateDocxLocal(inputPath, outputPath) {
  const docxContent = await getDocxContent(inputPath);

  const translatedDocxContent = await translateDocx({
    docxContent,
    sourceLanguage: "Detect language",
    targetLanguage: "Chinese (Simplified)",
    progressCallback: progress => {
      console.log("calcular progress aqui");
    },
  });
  saveTranslatedDocxContent(outputPath, translatedDocxContent);
}

export { translateDocx, translateDocxLocal, getZipContent };
