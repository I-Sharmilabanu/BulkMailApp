require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const sgMail = require("@sendgrid/mail");

const app = express();

/* ===================== CORS ===================== */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

/* ===================== MULTER ===================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/* ===================== SENDGRID ===================== */
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* ===================== MONGODB ===================== */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err.message));

/* ===================== SCHEMA ===================== */
const credentialSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
});

const Credential = mongoose.model(
  "Credential",
  credentialSchema,
  "bulkmail"
);

/* ===================== ROUTE ===================== */
app.post("/sendemail", upload.single("file"), async (req, res) => {
  try {
    const { msg, emailList } = req.body;
    const parsedEmails = JSON.parse(emailList || "[]");

    if (!msg || parsedEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message or email list missing",
      });
    }

    const sender = await Credential.findOne();
    if (!sender) {
      return res.status(500).json({
        success: false,
        message: "Sender email not found",
      });
    }

    /* -------- Attachment -------- */
    let attachments = [];
    if (req.file) {
      attachments.push({
        content: req.file.buffer.toString("base64"),
        filename: req.file.originalname,
        type: req.file.mimetype,
        disposition: "attachment",
      });
    }

    let failedEmails = [];

    for (const email of parsedEmails) {
      try {
        await sgMail.send({
          to: email,
          from: sender.user, // must be verified in SendGrid
          subject: "Bulk Mail",
          text: msg,
          attachments,
        });
      } catch (error) {
        console.error("Failed:", email, error.message);
        failedEmails.push(email);
      }
    }

    res.status(200).json({
      success: failedEmails.length === 0,
      failedEmails,
    });
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
