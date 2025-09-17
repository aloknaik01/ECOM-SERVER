import jwt from "jsonwebtoken";
import conf from "../config/conf.js";

 export const sendToken = (user, statusCode, message, res) => {
  const token = jwt.sign({ id: user.id }, conf.jwt.secretKey, {
    expiresIn: conf.jwt.expires,
  });

  res
    .status(statusCode)
    .cookie("token", token, {
      expires: new Date(Date.now() + conf.cookieExpires * 24 * 60 * 60 * 1000),
      http: true,
    })
    .json({
      success: true,
      user,
      message,
      token,
    });
};
