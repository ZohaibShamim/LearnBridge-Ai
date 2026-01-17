import Tesseract from "tesseract.js";

export async function extractTextFromCV(cvUrl) {
  const result = await Tesseract.recognize(
    cvUrl,
    "eng",
    {
      logger: (m) => console.log(m), // optional
    }
  );

  return result.data.text;
}
