const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP ERROR:", error);
  } else {
    console.log("Email service ready");
  }
});

const sendToEmail = async (email, otp) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>🔐 ChatApp Verification</h2>
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
  } catch (err) {
    console.error("Email send error:", err);
    throw err;
  }
};

module.exports = sendToEmail;
