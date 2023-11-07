// const { google } = require("googleapis");
// const fs = require("fs");

import { google } from "googleapis";
import fs from "fs";

const drive = google.drive("v3");
const OAuth2 = google.auth.OAuth2;

async function poorMansConvert(auth, inPath, outType, outPath) {
  const valid_output = [
    "text/html",
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/x-vnd.oasis.opendocument.spreadsheet",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  if (!valid_output.includes(outType)) {
    throw new Error(
      `Out type not valid, use one of the following: ${valid_output.join(",")}`
    );
  }

  const media = {
    mimeType: "application/octet-stream", // this should be adjusted based on your input file's type
    body: fs.createReadStream(inPath),
  };

  const file = await drive.files.create({
    resource: {
      name: "Temporary File for Conversion",
    },
    media: media,
    auth: auth,
    fields: "id, exportLinks",
  });

  const fileId = file.data.id;
  const exportLinks = file.data.exportLinks;

  if (exportLinks && exportLinks[outType]) {
    const downloadURL = exportLinks[outType];
    const response = await drive._http.request(downloadURL);
    if (response.status === 200) {
      fs.writeFileSync(outPath, response.data);
    } else {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    await drive.files.delete({ fileId: fileId, auth: auth });
  } else {
    throw new Error(
      `Output file type not compatible with input file, use one of the following: ${Object.keys(
        exportLinks
      ).join(",")}`
    );
  }

  return response.data;
}

// Aquí deberás configurar la autenticación OAuth2
// Deberías consultar la documentación oficial de googleapis para configurar OAuth2 adecuadamente.
