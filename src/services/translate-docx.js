import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateText } from "./translate-text.js";
import { translateParagraph } from "./translate-paragraph.js";

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

  console.log("translatedParagraphs", translatedParagraphs);

  replaceOriginalParagraphsNodesWithTranslated({
    paragraphs,
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
  paragraphs,
  translatedParagraphs,
}) {
  // 1. Recorremos cada párrafo en paragraphs.
  paragraphs.forEach((originalParagraph, originalIndex) => {
    // 2. Encontramos el párrafo correspondiente en translatedParagraphs usando el índice del párrafo.
    const translatedParagraph = translatedParagraphs.find(
      (_, translatedIndex) => translatedIndex === originalIndex
    );

    console.log("translatedParagraph", translatedParagraph);

    if (translatedParagraph) {
      const jsonTranslatedParagraph = convertStringToJSON(translatedParagraph);

      const originalNodes = findTextNodes(originalParagraph);
      // 3. Recorremos cada nodo en el párrafo actual.
      originalNodes.forEach((originalNode, nodeIndex) => {
        const translatedNode = jsonTranslatedParagraph.nodes.find(
          n => n.index === nodeIndex
        );

        console.log("translatedNode", translatedNode);

        if (translatedNode) {
          // Reemplazamos el contenido del nodo original con la traducción.
          originalNode["w:t"][0] = translatedNode.translation;
          console.log(`originalNode["w:t"][0]`, originalNode["w:t"][0]);
        }
      });
    }
  });
}

function convertStringToJSON(stringData) {
  let jsonData;
  try {
    jsonData = JSON.parse(stringData);
  } catch (error) {
    console.error("Error al convertir la cadena a JSON:", error);
    return null;
  }
  return jsonData;
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
