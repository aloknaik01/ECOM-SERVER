import app from "./src/app.js";
import conf from "./src/config/conf.js";

app.listen(conf.port, () => {
  console.log(`Server running on http://localhost:${conf.port}`);
});
