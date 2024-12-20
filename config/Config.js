require('dotenv').config();
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB)
  .then(() => {
    console.log("DB Has Been Connected");
  })
  .catch((error) => {
    console.error("DB Not Connect:", error);
  });
