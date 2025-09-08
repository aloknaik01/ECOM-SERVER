require("dotenv").config();

function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const _conf = {
  port: Number(required("PORT", 3000)),
  portfolioUrl: required("PORTFOLIO_URL"),
  smtp: {
    host: required("SMTP_HOST"),
    port: Number(required("SMTP_PORT")),
    service: required("SMTP_SERVICE"),
    mail: required("SMTP_MAIL"),
    password: required("SMTP_PASSWORD"),
  },
  cookieExpires: Number(required("COOKIE_EXPIRES", 7)),
  jwt: {
    secretKey: required("JWT_SECRET_KEY"),
    expires: required("JWT_EXPIRES"),
  },
};

module.exports = Object.freeze(_conf);
