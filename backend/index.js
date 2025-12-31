require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const sgMail = require("@sendgrid/mail");
const multer = require("multer");

const app = express();
app.use(cors({
  origin: "https://bulk-mail-app-84gp.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use("*",cors())

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://bulk-mail-app-84gp.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Multer
const upload = multer({ storage: multer.memoryStorage() });

// SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
app.get("/",(req,res)=> res.send("backend is running"))

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to DB"))
    .catch(() => console.log("Failed to connect DB"));

// Credential collection (optional)
const credential = mongoose.model("credential", {}, "bulkmail");

// API
app.post("/sendemail", upload.single("file"), async (req, res) => {
    try {
        const msg = req.body.msg;
        const emailList = JSON.parse(req.body.emailList || "[]");

        if (!msg || emailList.length === 0) {
            return res.json({ success: false, failedEmails: [] });
        }

        // ✅ ALWAYS use verified sender from ENV
        const sender = process.env.EMAIL_FROM;

        if (!sender) {
            return res.json({ success: false, message: "Sender not configured" });
        }

        let attachment = null;
        if (req.file) {
            attachment = {
                content: req.file.buffer.toString("base64"),
                filename: req.file.originalname,
                type: req.file.mimetype,
                disposition: "attachment"
            };
        }

        let failedEmails = [];

        for (let email of emailList) {
            email = email?.toString().trim();

            // ✅ Email validation
            if (!email || !email.includes("@")) {
                failedEmails.push(email);
                continue;
            }
          try {
                await sgMail.send({
                    to: email,
                    from: process.env.EMAIL_FROM,
                    subject: "Bulk Mail",
                    text: msg,
                    attachments: attachment ? [attachment] : []
                });
            } catch (err) {
                console.log("Failed:", email, err.message);
                failedEmails.push(email);
            }
        }

        res.json({
            success: failedEmails.length === 0,
            total: emailList.length,
            failedEmails
        });

    } catch (err) {
        console.log("Server error:", err.message);
        res.json({ success: false, failedEmails: [] });
    }
});



// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
