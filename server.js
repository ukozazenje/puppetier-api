const app = require("./app");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

app.listen(3000, () => {
  console.log(`listening in port ${3000}`);
});
