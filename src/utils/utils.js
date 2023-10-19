export function cleanText(text) {
  let newText = text.replace(/<!"|"!>/g, "");
  newText = newText.replace(/Current Node:|Next Node:/g, "");

  newText = newText.replace(/Out:/g, "");
  return text.replace(/<!"|"!>/g, "");
}

export function shouldRetry(translatedChunk, retryCount, retryLimit) {
  let shouldRetry = false;
  const lowerCaseChunk = translatedChunk.toLowerCase();
  const errorKeywords = [
    "misunderstanding",
    "sorry",
    "please",
    "apologie",
    "unable",
    "error",
    "provide",
    "assistant",
    "Out:",
    "Current Node:",
    "Next Node:",
  ];
  const arabicErrorKeywords = [
    "سوء فهم",
    "هل يمكن أن تقدم",
    "عذراً",
    "من فضلك",
    "اعتذار",
    "اعتذارات",
    "غير قادر",
    "يمد",
    "خطأ",
  ];

  if (
    errorKeywords.some(word => lowerCaseChunk.includes(word)) ||
    arabicErrorKeywords.some(word => translatedChunk.includes(word))
  ) {
    if (retryCount < retryLimit - 1) {
      shouldRetry =
        lowerCaseChunk.includes("Out:") ||
        lowerCaseChunk.includes("Next Node") ||
        lowerCaseChunk.includes("Current Node");
    } else {
      shouldRetry = lowerCaseChunk.includes("Out:");
    }
  }

  return shouldRetry;
}

export function hasTranslationErrors(translatedChunk) {
  const lowerCaseChunk = translatedChunk.toLowerCase();
  const errorKeywords = [
    "misunderstanding",
    "sorry",
    "please",
    "apologie",
    "unable",
    "error",
    "provide",
    "assistant",
  ];
  const arabicErrorKeywords = [
    "سوء فهم",
    "هل يمكن أن تقدم",
    "عذراً",
    "من فضلك",
    "اعتذار",
    "اعتذارات",
    "غير قادر",
    "يمد",
    "خطأ",
  ];

  // Retorna `true` si encuentra alguna de las palabras clave de error, tanto en inglés como en árabe
  return (
    errorKeywords.some(word => lowerCaseChunk.includes(word)) ||
    arabicErrorKeywords.some(word => translatedChunk.includes(word))
  );
}

export function isValidChunk(chunk, index) {
  const trimmedChunk = chunk.trim();
  const percentageRegex = /^\d+%$/;
  const multiplierRegex = /^\d+x$/;
  const singleCharRegex = /^.$/;
  const urlRegex =
    /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:\/~+#-]*[\w@?^=%&/~+#-])?$/;

  if (
    urlRegex.test(trimmedChunk) ||
    percentageRegex.test(trimmedChunk) ||
    multiplierRegex.test(trimmedChunk) ||
    singleCharRegex.test(trimmedChunk)
  ) {
    console.log(
      `Chunk ${
        index + 1
      } is a URL, percentage, multiplier, or single character. Using original text.`
    );
    return false;
  }
  return true;
}

export const languageMap = {
  English: {
    inExample: `Snapchat es una plataforma para autoexpresión con imágenes y videos.`,
    outExample: `Snapchat is a platform for self-expression through images and videos.`,
  },
  Spanish: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat es una plataforma para autoexpresión con imágenes y videos.`,
  },
  French: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat est une plateforme pour l'auto-expression à travers des images et des vidéos.`,
  },
  German: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat ist eine Plattform zur Selbstausdruck durch Bilder und Videos.`,
  },
  Italian: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat è una piattaforma per autoespressione con immagini e video.`,
  },
  Portuguese: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat é uma plataforma para autoexpressão com imagens e vídeos.`,
  },
  Russian: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat - платформа для самовыражения с помощью изображений и видео.`,
  },
  Arabic: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `سناب شات منصة للتعبير عن النفس بالصور والفيديوهات.`,
  },
  Chinese: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchat是一个通过图片和视频进行自我表达的平台。`,
  },
  Japanese: {
    inExample: `Snapchat is a platform for self-expression through images and videos.`,
    outExample: `Snapchatは、画像や動画を通じて自己表現をするプラットフォームです。`,
  },
};
