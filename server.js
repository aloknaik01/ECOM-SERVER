import app from "./src/app.js";
import conf from "./src/config/conf.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: conf.cloud_name,
  api_key: conf.api_key,
  api_secret: conf.api_secret,
});

app.listen(conf.port, () => {
  console.log(`Server running on http://localhost:${conf.port}`);
});
