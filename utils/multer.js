import multer from "multer";

// Store files in memory for direct upload to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

export default upload;