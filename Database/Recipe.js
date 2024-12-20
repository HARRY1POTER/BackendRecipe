const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema({
  photo: String,
  recipeTitle: String,
  about: String,
  keywords: String,
  steps: String,
  ingredients: String,
});

module.exports = mongoose.model("Recipe", recipeSchema);
