require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "waste-reports",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage: photoStorage });

// Handles all three possible file types a guest report can include:
// a photo, a voice note, or a video — each routed to the correct
const uploadWithAudio = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      if (file.fieldname === "audio") {
        return {
          folder: "waste-reports-audio",
          resource_type: "video",
          allowed_formats: ["m4a", "mp3", "wav", "aac"],
        };
      }
      if (file.fieldname === "video") {
        return {
          folder: "waste-reports-video",
          resource_type: "video",
          allowed_formats: ["mp4", "mov", "m4v"],
        };
      }
      return {
        folder: "waste-reports",
        allowed_formats: ["jpg", "jpeg", "png"],
      };
    },
  }),
});

module.exports = { upload, uploadWithAudio };