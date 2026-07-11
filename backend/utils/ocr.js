import Tesseract from "tesseract.js";
import axios from "axios";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

async function downloadBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  return Buffer.from(res.data);
}

// Turn a Cloudinary PDF delivery URL into a rasterized first-page PNG so Tesseract can
// OCR a scanned (image-only) PDF. e.g. /image/upload/v1/f.pdf -> /image/upload/pg_1/v1/f.png
function cloudinaryPdfToPng(url) {
  return url
    .replace("/upload/", "/upload/pg_1/")
    .replace(/\.pdf($|\?)/i, ".png$1");
}

async function extractFromImage(url) {
  const result = await Tesseract.recognize(url, "eng");
  return result.data.text;
}

async function extractFromPdf(url) {
  const buffer = await downloadBuffer(url);
  let text = "";
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text || "";
    await parser.destroy?.();
  } catch (e) {
    console.warn("[ocr] pdf-parse failed, will try OCR fallback:", e.message);
  }

  // Scanned/image-only PDF -> little or no embedded text. Fall back to OCR on a
  // rasterized page image delivered by Cloudinary.
  if (text.trim().length < 20) {
    try {
      const pngUrl = cloudinaryPdfToPng(url);
      console.log("[ocr] PDF had no text layer, OCR fallback on:", pngUrl);
      text = await extractFromImage(pngUrl);
    } catch (e) {
      console.warn("[ocr] PDF OCR fallback failed:", e.message);
    }
  }
  return text;
}

async function extractFromDocx(url) {
  const buffer = await downloadBuffer(url);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

// Unified entry point. fileType comes from the Job ("image" | "pdf" | "docx");
// falls back to extension sniffing, then to OCR.
export async function extractTextFromCV(cvUrl, fileType) {
  const type = fileType || sniffType(cvUrl);
  if (type === "pdf") return extractFromPdf(cvUrl);
  if (type === "docx") return extractFromDocx(cvUrl);
  return extractFromImage(cvUrl);
}

function sniffType(url) {
  const clean = (url || "").split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (clean.endsWith(".docx")) return "docx";
  return "image";
}
