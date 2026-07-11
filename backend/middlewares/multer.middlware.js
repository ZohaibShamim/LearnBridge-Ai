import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // keep extension
    cb(null, file.fieldname + "-" + Date.now() + ext);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches the frontend limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];

    const allowedExts = [".jpg", ".jpeg", ".png", ".pdf", ".docx"];

    const isAllowedMime = allowedMimeTypes.includes(file.mimetype);
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = allowedExts.includes(ext);

    if (isAllowedMime && isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, PDF, or DOCX files are allowed!"), false);
    }
  },
});
