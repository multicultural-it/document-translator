import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateText } from "./translate-text.js";
import { translateParagraph } from "./translate-paragraph.js";
import JSON5 from "json5";

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
  return traverse(node);
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
  return textNodes.map(node => getChunkFromNode(node["w:t"][0])).join("");
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

  const translatedParagraphs = await Promise.all(
    jsonParagraphs.map(async paragraph => translateParagraph({ paragraph }))
  );

  replaceOriginalParagraphsNodesWithTranslated({
    jsonParagraphs,
    translatedParagraphs,
  });

  const translatedDocxContent = await buildTranslatedDocxContent(
    documentObj,
    docxContent
  );

  saveTranslatedDocxContent(outputPath, translatedDocxContent);

  console.log(`Traducción completada.`);
}

function replaceOriginalParagraphsNodesWithTranslated({
  jsonParagraphs,
  translatedParagraphs,
}) {
  jsonParagraphs.forEach((originalParagraph, originalIndex) => {
    const translatedParagraph = translatedParagraphs.find(
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

export { translateDocx };

// Función Principal
// async function translateDocx(inputPath, outputPath) {
//   const docxContent = await getDocxContent(inputPath);
//   const documentObj = await getDocumentObjectFromDocxContent(docxContent);

//   const textNodes = findTextNodes(documentObj["w:document"]["w:body"][0]);

//   const translatedNodes = await Promise.all(
//     nodes.map((node, index) =>
//       translateTextNode(node["w:t"][0], index, textNodes)
//     )
//   );

//   console.log("translatedNodes", translatedNodes);

//   replaceOriginalTextNodesWithTranslated(textNodes, translatedNodes);

//   const translatedDocxContent = await buildTranslatedDocxContent(
//     documentObj,
//     docxContent
//   );

//   saveTranslatedDocxContent(outputPath, translatedDocxContent);

//   console.log(`Traducción completada.`);
// }

// import fs from "fs";
// import JSZip from "jszip";
// import xml2js from "xml2js";
// import { translateText } from "./translate-text.js";
// import { translateParagraph } from "./translate-paragraph.js";

// // Utilidades de Nodo
// function getChunkFromNode(node) {
//   return node?._ || "";
// }

// function findTextNodes(node) {
//   function traverse(currentNode) {
//     if (!currentNode || typeof currentNode !== "object") return [];
//     if (currentNode["w:t"]) return [currentNode];
//     return Object.values(currentNode).flatMap(child => traverse(child));
//   }
//   return traverse(node);
// }

// // function findParagraphNodes(node) {
// //   function traverse(currentNode) {
// //     if (!currentNode || typeof currentNode !== "object") return [];
// //     if (currentNode["w:p"]) return [currentNode];
// //     return Object.values(currentNode).flatMap(child => traverse(child));
// //   }
// //   return traverse(node);
// // }

// function findParagraphNodes(node) {
//   const paragraphs = [];

//   function traverse(currentNode) {
//     if (!currentNode || typeof currentNode !== "object") return;
//     // if (currentNode["w:p"]) {
//     if (currentNode["w:pPr"]) {
//       paragraphs.push(currentNode);
//       return;
//     }
//     Object.values(currentNode).forEach(child => traverse(child));
//   }

//   traverse(node);
//   return paragraphs;
// }

// function getTextFromParagraph(paragraphNode) {
//   const textNodes = findTextNodes(paragraphNode);
//   return textNodes.map(node => getChunkFromNode(node["w:t"][0])).join("");
// }

// // Utilidades de Traducción
// async function translateTextNode(node, index, allTextNodes) {
//   const currentChunk = getChunkFromNode(node);
//   const leftChunk = getChunkFromNode(allTextNodes[index - 1]);
//   const rightChunk = getChunkFromNode(allTextNodes[index + 1]);

//   if (!currentChunk) return { ...node };

//   const translatedChunk = await translateText({
//     chunk: currentChunk,
//     leftChunk,
//     rightChunk,
//     targetLanguage: "Spanish",
//   });

//   return { ...node, _: translatedChunk };
// }

// // Utilidades DOCX
// async function getDocxContent(inputPath) {
//   const content = fs.readFileSync(inputPath);
//   const zip = new JSZip();
//   await zip.loadAsync(content);
//   return zip;
// }

// async function getDocumentObjectFromDocxContent(zipContent) {
//   const documentXml = await zipContent
//     .file("word/document.xml")
//     .async("string");
//   return new xml2js.Parser().parseStringPromise(documentXml);
// }

// async function buildTranslatedDocxContent(documentObj, zipContent) {
//   const translatedDocumentXml = new xml2js.Builder().buildObject(documentObj);
//   return zipContent
//     .file("word/document.xml", translatedDocumentXml)
//     .generateAsync({ type: "nodebuffer" });
// }

// function saveTranslatedDocxContent(outputPath, translatedDocxContent) {
//   fs.writeFileSync(outputPath, translatedDocxContent);
// }
// async function translateDocx(inputPath, outputPath) {
//   const docxContent = await getDocxContent(inputPath);
//   const documentObj = await getDocumentObjectFromDocxContent(docxContent);

//   const paragraphs = findParagraphNodes(documentObj["w:document"]["w:body"][0]);

//   const jsonParagraphs = paragraphs
//     .map(node => ({
//       paragraph: getTextFromParagraph(node),
//       nodes: findTextNodes(node).map((node, index) => ({
//         index,
//         originalText: node._,
//       })),
//     }))
//     .filter(paragraph => paragraph.paragraph.length > 0);

//   const translatedParagraphs = await Promise.all(
//     jsonParagraphs.map(async paragraph => translateParagraph({ paragraph }))
//   );

//   console.log("translatedParagraphs", translatedParagraphs);

//   replaceOriginalParagraphsNodesWithTranslated({
//     paragraphs,
//     translatedParagraphs,
//   });
// }

// // function replaceOriginalTextNodesWithTranslated(
// //   originalNodes,
// //   translatedNodes
// // ) {
// //   originalNodes.forEach((originalNode, index) => {
// //     originalNode["w:t"][0] = translatedNodes[index];
// //   });
// // }

// function replaceOriginalParagraphsNodesWithTranslated({
//   paragraphs,
//   translatedParagraphs,
// }) {}

// test().then(() => console.log("done"));

// export { translateDocx };
