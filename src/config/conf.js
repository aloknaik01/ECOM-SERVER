import dotenv from "dotenv";

dotenv.config();

function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const _conf = {
  port: Number(required("PORT", 3000)),
  clientUrl: required("CLIENT_URL"),
  smtp: {
    host: required("SMTP_HOST"),
    port: Number(required("SMTP_PORT")),
    service: required("SMTP_SERVICE"),
    mail: required("SMTP_MAIL"),
    password: required("SMTP_PASSWORD"),
  },
  db: {
    db_user: required("DB_USER"),
    db_host: required("DB_HOST"),
    db_password: required("DB_PASSWORD"),
    db_name: required("DB_NAME"),
    db_port: required("DB_PORT"),
  },

  cookieExpires: Number(required("COOKIE_EXPIRES", 7)),
  jwt: {
    secretKey: required("JWT_SECRET_KEY"),
    expires: required("JWT_EXPIRES"),
  },
};

export default Object.freeze(_conf);
