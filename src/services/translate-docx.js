import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateParagraph } from "./translate-paragraph.js";
import { improveParagraph } from "./improve-paragraph.js";

async function getDocxContent(inputPath) {
  const content = fs.readFileSync(inputPath);
  console.log("content: ", content);
  console.log("type of content: ", typeof content);
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
  console.log("CREANDO ARCHIVO: ");
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

        console.log(
          `Procesando nodo original con índice ${originalIndex}:`,
          originalNode
        );

        const translatedNode = translatedParagraph.nodes.find(
          translatedNode => {
            console.log(
              "translated node: ",
              JSON.stringify(translatedNode, null, 2)
            );

            console.log("original index: ", originalIndex);
            console.log("translated index: ", translatedNode.index);

            const translatedIndex = translatedNode.index ?? 1;
            const isFound = translatedIndex === originalIndex;

            return isFound;
          }
        );

        if (translatedNode) {
          console.log(
            `Nodo traducido encontrado para índice ${originalIndex}:`,
            translatedNode
          );
        } else {
          console.log(
            `No se encontró nodo traducido para índice ${originalIndex}`
          );
        }

        if (translatedNode) {
          const clonedNode = JSON.parse(JSON.stringify(originalNode["w:t"][0]));

          clonedNode._ = translatedNode.translation;

          console.log(
            "originalNode wt 0: ",
            JSON.stringify(originalNode["w:t"][0], null, 2)
          );

          console.log("clonedNode: ", JSON.stringify(clonedNode, null, 2));

          console.log(
            "type of originalNode['w:t'][0]: ",
            typeof originalNode["w:t"][0]
          );
          console.log("type of clonedNode: ", typeof clonedNode);

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

async function translateDocxLocal(inputPath, outputPath) {
  const docxContent = await getDocxContent(inputPath);
  // console.log("docxContent: ", docxContent);
  // console.log("type of docxContent: ", typeof docxContent);

  const translatedDocxContent = await translateDocx(docxContent);
  saveTranslatedDocxContent(outputPath, translatedDocxContent);
}

async function translateDocx(docxContent) {
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
  const CHUNK_SIZE = 8;
  const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);
  const translatedParagraphs = await processBlocks(blocks, translateParagraph);

  const translatedParagraphsWithOriginal = translatedParagraphs.map(
    (translatedParagraph, paragraphIndex) => {
      const originalParagraph = jsonParagraphs[paragraphIndex];

      return {
        ...translatedParagraph,
        nodes: translatedParagraph.nodes.map(translatedNode => {
          const originalNode = originalParagraph.nodes.find(node => {
            console.log("original index: ", node.index);
            console.log("translated index: ", translatedNode.index);

            const translatedIndex = translatedNode.index ?? 1;

            return node.index === translatedIndex;
          });

          console.log("originalNode: ", originalNode);
          console.log("translatedNode: ", translatedNode);

          return {
            ...translatedNode,
            original: originalNode.originalText,
            translation: translatedNode.translation,
          };
        }),
      };
    }
  );

  const improvedParagraphs = await processBlocks(
    chunkArray(translatedParagraphsWithOriginal, CHUNK_SIZE),
    improveParagraph
  );

  replaceOriginalParagraphsNodesWithTranslated({
    jsonParagraphs,
    improvedParagraphs,
  });

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  return translatedDocxContent;
  // saveTranslatedDocxContent(outputPath, translatedDocxContent);
}

export { translateDocx, translateDocxLocal, getZipContent };
