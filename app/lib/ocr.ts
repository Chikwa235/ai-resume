import Tesseract from "tesseract.js";

export async function ocrImageFile(imageFile: File) {
  const result = await Tesseract.recognize(imageFile, "eng", {
    logger: () => {}, // optionally log progress
  });

  return (result?.data?.text || "").trim();
}