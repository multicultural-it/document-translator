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

function findParagraphNodes(node) {
  const paragraphs = [];

  function traverse(currentNode) {
    if (!currentNode || typeof currentNode !== "object") return;

    if (currentNode["w:pPr"]) {
      paragraphs.push(currentNode);
      return;
    }
    if (currentNode["w:p"]) {
      paragraphs.push(currentNode["w:p"]);
      return;
    }
    Object.values(currentNode).forEach(child => traverse(child));
  }

  traverse(node);

  return paragraphs;
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
          if (originalNode["w:t"] && Array.isArray(originalNode["w:t"])) {
            const clonedNode = JSON.parse(
              JSON.stringify(originalNode["w:t"][0])
            );
            clonedNode._ = translatedNode.translation;

            if (clonedNode && clonedNode._) {
              originalNode["w:t"][0] = clonedNode;
            }
          }
          if (originalNode[0] && typeof originalNode[0] === "string") {
            originalNode[0] = translatedNode.translation;
          } else {
            const clonedNode = JSON.parse(JSON.stringify(originalNode[0]));
            console.log("clonedNode", clonedNode);
            console.log(
              "stringify originalNode[0]",
              JSON.stringify(originalNode[0])
            );
            clonedNode._ = translatedNode.translation;

            if (clonedNode && clonedNode._) {
              originalNode[0] = clonedNode;
            }
          }
        }
      });
    }
  });
}

async function processBlocks({
  blocks,
  fn,
  progressCallback,
  sourceLanguage,
  targetLanguage,
}) {
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

async function translateDocx({
  docxContent,
  sourceLanguage,
  targetLanguage,
  progressCallback,
}) {
  console.log("##################################################");

  const documentObj = await getDocumentObjectFromDocxContent(docxContent);

  const paragraphs = findParagraphNodes(documentObj["w:document"]["w:body"][0]);

  // console.log("PARAGRAPHS: ", JSON.stringify(paragraphs, null, 2));
  // console.log("PARAGRAPHS LENGTH: ", paragraphs.length);

  const jsonParagraphs = paragraphs
    .map(node => ({
      originalNode: node,
      paragraph: getTextFromParagraph(node),
      nodes: findTextNodes(node).map((node, nodeIndex) => {
        let originalText;

        if (Array.isArray(node)) {
          if (node[0]._ !== undefined) {
            originalText = node[0]._;
          } else {
            originalText = node[0];
          }
        } else {
          if (node._ !== undefined) {
            originalText = node._;
          } else {
            originalText = node;
          }
        }

        return {
          index: nodeIndex + 1,
          originalText: originalText,
        };
      }),
    }))
    .filter(paragraph => paragraph.paragraph.length > 0);

  // console.log("JSON PARAGRAPHS: ", jsonParagraphs);
  // console.log("JSON PARAGRAPHS LENGTH: ", jsonParagraphs.length);

  const CHUNK_SIZE = 8;
  const blocks = chunkArray(jsonParagraphs, CHUNK_SIZE);

  const improvedParagraphs = await processBlocks({
    blocks,
    fn: translateImproveParagraph,
    progressCallback,
    sourceLanguage,
    targetLanguage,
  });

  // console.log("IMPROVED PARAGRAPHS: ", improvedParagraphs);
  console.log(
    "IMPROVED PARAGRAPHS: ",
    JSON.stringify(improvedParagraphs, null, 2)
  );

  replaceOriginalParagraphsNodesWithTranslated({
    jsonParagraphs,
    // improvedParagraphs: null,
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
    sourceLanguage: "English",
    targetLanguage: "Spanish (Argentina)",
    progressCallback: progress => {
      console.log("calcular progress aqui");
    },
  });
  saveTranslatedDocxContent(outputPath, translatedDocxContent);
}

export { translateDocx, translateDocxLocal, getZipContent };

// if (translatedNode) {
//   let clonedNode;

//   if (Array.isArray(originalNode["w:t"])) {
//     clonedNode = JSON.parse(JSON.stringify(originalNode["w:t"][0]));
//     if (clonedNode._ !== undefined) {
//       clonedNode._ = translatedNode.translation;
//     } else {
//       clonedNode = { _: translatedNode.translation };
//     }
//     originalNode["w:t"][0] = clonedNode;
//   } else {
//     clonedNode = JSON.parse(JSON.stringify(originalNode["w:t"]));
//     if (clonedNode._ !== undefined) {
//       clonedNode._ = translatedNode.translation;
//     } else {
//       clonedNode = { _: translatedNode.translation };
//     }
//     originalNode["w:t"] = clonedNode;
//   }

//   if (!clonedNode || !clonedNode._) {
//     console.log("clonedNode no tiene texto o es nulo");
//   }
// }
