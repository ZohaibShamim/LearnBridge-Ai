import Tesseract from "tesseract.js";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Fast text extraction from a local file buffer (PDF/DOCX). Done inline in the upload
// controller because it's quick (ms) and because Cloudinary blocks PDF/raw *delivery* by
// default (so the worker can't re-download the file). Image OCR is slow and stays in the
// worker (see extractTextFromCV).
export async function extractTextFromBuffer(buffer, fileType) {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();
    return result.text || "";
  }
  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  return "";
}

// Turn a Cloudinary PDF delivery URL into a rasterized first-page PNG. The output format is
// PNG (not PDF), so it is NOT subject to Cloudinary's PDF-delivery restriction — this lets
// us OCR a scanned/image-only PDF whose text layer came back empty.
export function cloudinaryPdfToPng(url) {
  return url
    .replace("/upload/", "/upload/pg_1/")
    .replace(/\.pdf($|\?)/i, ".png$1");
}

async function ocrImageUrl(url) {
  const result = await Tesseract.recognize(url, "eng");
  return result.data.text || "";
}

// OCR path used by the worker. Images are OCR'd directly. For a PDF that arrived here with
// no extracted text (scanned PDF), OCR its rasterized first page.
export async function extractTextFromCV(cvUrl, fileType) {
  if (fileType === "pdf") {
    return ocrImageUrl(cloudinaryPdfToPng(cvUrl));
  }
  return ocrImageUrl(cvUrl);
}
