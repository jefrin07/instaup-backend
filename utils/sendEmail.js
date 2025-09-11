import transporter from "../config/nodemailer.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    await transporter.sendMail({
      from: `"InstaUp" <${process.env.SMTP_EMAIL}>`, // sender
      to,
      subject,
      text: text || "", // fallback plain text
      html: html || "", // HTML content
    });
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw new Error("Email send failed");
  }
};
