import nodeMailer from "nodemailer";
import conf from "../config/conf.js";

export const sendEmail = async ({ email, subject, messages }) => {
  console.log("Entered");
  console.log(email, subject, messages);
  const transporter = nodeMailer.createTransport({
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
    html: messages,
  };

  await transporter.sendMail(mailOptions);
};
