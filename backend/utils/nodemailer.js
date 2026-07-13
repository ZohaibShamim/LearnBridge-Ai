import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const otpEmailViaNodemailer = async (otp, email) => {
  const mailOption = {
    // Gmail SMTP rewrites / spam-filters a From that isn't the authed account.
    from: `Learn Bridge AI <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f6f9fc; padding:24px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 30px rgba(2,6,23,0.08);">
          <div style="background:linear-gradient(90deg,#4f46e5 0%,#06b6d4 100%); padding:20px 24px; color:#fff; text-align:center;">
            <h2 style="margin:0; font-size:18px; font-weight:700;">Learn Bridge AI</h2>
            <p style="margin:6px 0 0; font-size:13px; opacity:0.95;">Email verification</p>
          </div>

          <div style="padding:30px 28px; text-align:center;">
            <p style="margin:0 0 18px; color:#0f172a; font-size:15px;">Use the code below to verify your email address</p>

            <div style="display:inline-block; padding:18px 26px; border-radius:10px; background:linear-gradient(180deg,#ffffff,#f8fafc); box-shadow:0 6px 20px rgba(2,6,23,0.06);">
              <span style="font-size:34px; letter-spacing:6px; font-weight:800; font-family: 'Courier New', Courier, monospace; color:#0f172a;">${otp}</span>
            </div>

            <p style="margin:18px 0 0; color:#374151; font-size:13px;">This code expires in <strong>3 minutes</strong>. Do not share it with anyone.</p>

            <div style="margin-top:22px; text-align:center;">
              <a href="#" style="display:inline-block; padding:10px 16px; border-radius:8px; background:#eef2ff; color:#3730a3; text-decoration:none; font-size:13px;">Verify in app</a>
            </div>
          </div>

          <div style="padding:14px 20px; background:#fbfbff; text-align:center; font-size:12px; color:#94a3b8;">
            <div>If you didn't request this, you can ignore this email.</div>
            <div style="margin-top:6px;">Need help? <a href="mailto:support@learnbridge.ai" style="color:#6366f1; text-decoration:none;">support@learnbridge.ai</a></div>
          </div>
        </div>

        <p style="max-width:600px; margin:12px auto 0; font-size:12px; color:#9aa4b2; text-align:center;">Learn Bridge AI</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOption);
    return info;
  } catch (error) {
    throw new Error("Failed to send OTP email");
  }
};