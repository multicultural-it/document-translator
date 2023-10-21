import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateParagraph } from "./translate-paragraph.js";
import { improveParagraph } from "./improve-paragraph.js";

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
  jsonParagraphs.forEach((originalParagraph, originalIndex) => {
    const translatedParagraph = improvedParagraphs.find(
      (_, translatedIndex) => translatedIndex === originalIndex
    );

    if (translatedParagraph) {
      const originalNodes = findTextNodes(originalParagraph.originalNode);

      originalNodes.forEach((originalNode, nodeIndex) => {
        const translatedNode = translatedParagraph.nodes.find(
          n => n.index === nodeIndex
        );

        if (translatedNode) {
          originalNode["w:t"][0] = translatedNode.translation;
        }
      });
    }
  });
}

async function translateDocx(inputPath, outputPath) {
  const docxContent = await getDocxContent(inputPath);

  const documentObj = await getDocumentObjectFromDocxContent(docxContent);

  const paragraphs = findParagraphNodes(documentObj["w:document"]["w:body"][0]);

  const jsonParagraphs = paragraphs
    .map(node => ({
      originalNode: node,
      paragraph: getTextFromParagraph(node),
      nodes: findTextNodes(node).map((node, nodeIndex) => ({
        index: nodeIndex,
        originalText: node["w:t"][0]._,
      })),
    }))
    .filter(paragraph => paragraph.paragraph.length > 0);

  // const translatedParagraphs = await Promise.all(
  //   jsonParagraphs.map(async paragraph =>
  //     translateParagraph({ paragraph, targetLanguage: "Spanish (Argentina)" })
  //   )
  // );

  async function processBlocks(blocks, fn) {
    let results = [];
    for (let block of blocks) {
      let translatedBlock = await Promise.all(
        block.map(paragraph =>
          fn({
            paragraph,
            targetLanguage: "Spanish (Argentina)",
          })
        )
      );
      results.push(...translatedBlock);
    }
    return results;
  }
  const CHUNK_SIZE = 4;
  const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);
  const translatedParagraphs = await processBlocks(blocks, translateParagraph);

  const translatedParagraphsWithOriginal = translatedParagraphs.map(
    (translatedParagraph, paragraphIndex) => {
      const originalParagraph = jsonParagraphs[paragraphIndex];

      return {
        ...translatedParagraph,
        nodes: translatedParagraph.nodes.map(translatedNode => {
          const originalNode = originalParagraph.nodes.find(
            node => node.index === translatedNode.index
          );

          return {
            ...translatedNode,
            original: originalNode.originalText,
            translation: translatedNode.translation,
          };
        }),
      };
    }
  );

  // const improvedParagraphs = await Promise.all(
  //   translatedParagraphsWithOriginal.map(async paragraph =>
  //     improveParagraph({ paragraph })
  //   )
  // );

  console.log(
    "translatedParagraphsWithOriginal",
    JSON.stringify(translatedParagraphsWithOriginal, null, 2)
  );

  const improvedParagraphs = await processBlocks(
    chunkArray(translatedParagraphsWithOriginal, CHUNK_SIZE),
    improveParagraph
  );

  console.log(
    "improvedParagraphs",
    JSON.stringify(improvedParagraphs, null, 2)
  );

  replaceOriginalParagraphsNodesWithTranslated({
    jsonParagraphs,
    improvedParagraphs,
  });

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  saveTranslatedDocxContent(outputPath, translatedDocxContent);
}

function chunkArray(myArray, chunk_size) {
  const cloneMyArray = [...myArray];
  let results = [];
  while (cloneMyArray.length) {
    results.push(cloneMyArray.splice(0, chunk_size));
  }
  return results;
}

export { translateDocx };
