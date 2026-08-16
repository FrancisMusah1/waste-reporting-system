require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config specifically for photo evidence
const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "waste-reports",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Separate storage config for voice notes 
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "waste-reports-audio",
    resource_type: "video",
    allowed_formats: ["m4a", "mp3", "wav", "aac"],
  },
});

const upload = multer({ storage: photoStorage });

// A second multer instance, specifically for routes that accept both
// a photo AND an audio file together (like guest reporting)
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
      return {
        folder: "waste-reports",
        allowed_formats: ["jpg", "jpeg", "png"],
      };
    },
  }),
});

module.exports = { upload, uploadWithAudio };