const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP ERROR:", error);
  } else {
    console.log("Email service ready");
  }
});

const sendToEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>🔐 WhatsApp Web Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>Valid for 5 minutes.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `ChatApp <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ChatApp Verification Code",
    html,
  });
};

module.exports = sendToEmail;
