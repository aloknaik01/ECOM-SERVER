import express from "express";
import { config } from "dotenv";
import cors from "cors";
import conf from "./config/conf.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { createTables } from "./utils/createTable.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

const app = express();
config();

app.use(
  cors({
    origin: conf.portfolioUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  fileUpload({
    tempFileDir: "/uploads",
    useTempFiles: true,
  })
);

createTables();
app.use(errorMiddleware);

export default app;
