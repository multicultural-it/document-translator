import fs from "fs";
import JSZip from "jszip";
import xml2js from "xml2js";
import { translateText } from "./translate-text.js";

// 1. Extracción de funciones:
function findTextNodes(node) {
  const textNodes = [];

  function traverse(currentNode) {
    if (typeof currentNode !== "object" || !currentNode) return;

    if (currentNode["w:t"]) {
      textNodes.push(currentNode);
      return;
    }

    Object.values(currentNode).forEach(child => {
      if (Array.isArray(child)) {
        child.forEach(grandChild => traverse(grandChild));
      } else {
        traverse(child);
      }
    });
  }

  traverse(node);
  return textNodes;
}

// 2. Simplificación de `translateNode`:
async function translateTextNode(node, index, allTextNodes) {
  let leftChunk = "",
    rightChunk = "";

  if (
    index > 0 &&
    allTextNodes[index - 1]["w:t"] &&
    allTextNodes[index - 1]["w:t"][0]
  ) {
    leftChunk = allTextNodes[index - 1]["w:t"][0]._ || "";
  }

  if (
    index < allTextNodes.length - 1 &&
    allTextNodes[index + 1]["w:t"] &&
    allTextNodes[index + 1]["w:t"][0]
  ) {
    rightChunk = allTextNodes[index + 1]["w:t"][0]._ || "";
  }

  if (node._ && node._.length > 0) {
    node._ = await translateText({
      chunk: node._,
      leftChunk,
      rightChunk,
      targetLanguage: "Spanish",
    });
  } else {
    console.log(
      "Chunk is empty. Skipping translation and using original text."
    );
  }
}

async function translateAllTextNodes(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    await translateTextNode(nodes[i]["w:t"][0], i, nodes);
  }
}

// 3. Claridad en la función principal:
async function translateDocx(inputPath, outputPath) {
  const docxContent = fs.readFileSync(inputPath);
  const zip = new JSZip();
  await zip.loadAsync(docxContent);

  const documentXml = await zip.file("word/document.xml").async("string");
  const parser = new xml2js.Parser();
  const documentObj = await parser.parseStringPromise(documentXml);

  const textNodes = findTextNodes(documentObj["w:document"]["w:body"][0]);
  await translateAllTextNodes(textNodes);

  const builder = new xml2js.Builder();
  const translatedDocumentXml = builder.buildObject(documentObj);
  zip.file("word/document.xml", translatedDocumentXml);
  const translatedDocxContent = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outputPath, translatedDocxContent);

  console.log(`Traducción completada.`);
}

export { translateDocx };

// async function translateDocx(inputPath, outputPath) {
//   const docxContent = fs.readFileSync(inputPath);
//   const zip = new JSZip();
//   await zip.loadAsync(docxContent);

//   const documentXml = await zip.file("word/document.xml").async("string");
//   const parser = new xml2js.Parser();
//   const documentObj = await parser.parseStringPromise(documentXml);

//   function findTextNodes(node) {
//     const textNodes = [];

//     function traverse(currentNode) {
//       if (typeof currentNode !== "object" || !currentNode) return;

//       if (currentNode["w:t"]) {
//         textNodes.push(currentNode);
//         return;
//       }

//       Object.values(currentNode).forEach(child => {
//         if (Array.isArray(child)) {
//           child.forEach(grandChild => traverse(grandChild));
//         } else {
//           traverse(child);
//         }
//       });
//     }

//     traverse(node);
//     return textNodes;
//   }

//   const textNodes = findTextNodes(documentObj["w:document"]["w:body"][0]);

//   async function translateNode(node) {
//     if (!node) return;

//     const textNodes = findTextNodes(node);

//     for (let i = 0; i < textNodes.length; i++) {
//       const currentNode = textNodes[i];
//       let leftChunk = "",
//         rightChunk = "";

//       if (i > 0 && textNodes[i - 1]["w:t"] && textNodes[i - 1]["w:t"][0]) {
//         leftChunk = textNodes[i - 1]["w:t"][0]._ || "";
//       }

//       if (
//         i < textNodes.length - 1 &&
//         textNodes[i + 1]["w:t"] &&
//         textNodes[i + 1]["w:t"][0]
//       ) {
//         rightChunk = textNodes[i + 1]["w:t"][0]._ || "";
//       }

//       // Verificando existencia y tipo antes de intentar asignación
//       if (currentNode["w:t"] && Array.isArray(currentNode["w:t"])) {
//         for (const textNode of currentNode["w:t"]) {
//           console.log("i:", i);
//           console.log("CURRENT:", textNode._);
//           console.log("<< leftChunk:", leftChunk);
//           console.log(">> rightChunk:", rightChunk);

//           if (textNode && typeof textNode === "object" && textNode._) {
//             if (textNode._.length > 0) {
//               textNode._ = await translateText({
//                 chunk: textNode._,
//                 leftChunk,
//                 rightChunk,
//                 targetLanguage: "Spanish",
//               });
//             } else {
//               console.log(
//                 "Chunk is empty. Skipping translation and using original text."
//               );
//             }
//           }
//         }
//       }
//     }
//   }

//   await translateNode(documentObj["w:document"]["w:body"][0]);

//   const builder = new xml2js.Builder();
//   const translatedDocumentXml = builder.buildObject(documentObj);
//   zip.file("word/document.xml", translatedDocumentXml);
//   const translatedDocxContent = await zip.generateAsync({ type: "nodebuffer" });
//   fs.writeFileSync(outputPath, translatedDocxContent);
//   console.log(`Traducción completada.`);
// }

// export { translateDocx };
