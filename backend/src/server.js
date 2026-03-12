import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Roastek backend listening on http://127.0.0.1:${config.port}`);
});
