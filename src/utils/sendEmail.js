import nodemailer from "nodemailer";
import conf from "../config/conf.js";

export const sendEmail = async ({ email, subject, message }) => {
  const transporter = nodemailer.createTransport({
    host: conf.smtp.host,
    service: conf.smtp.port,
    port: conf.smtp.port,
    auth: {
      user: conf.smtp.mail,
      pass: conf.smtp.password,
    },
  });

  const mailOptions = {
    from: conf.smtp.mail,
    to: email,
    subject,
    html: message,
  };
};
