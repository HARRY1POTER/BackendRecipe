const express = require("express");
const cors = require("cors");
const Save = require("./Database/save");

require("./config/Config");
const User = require("./Database/User");
const Recipe = require("./Database/Recipe");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.get("/", (req, res) => {
  res.send("This is Backend");
});

app.post("/register", async (req, res) => {
  try {
    // Check if all required fields are present in the request body
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        type: "validation",
        message: "All fields are required",
      });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        type: "duplicate",
        message: "Email is already registered",
      });
    }

    // Create a new user instance and save it to the database
    const newUser = new User({
      name,
      email,
      password,
    });
    const savedUser = await newUser.save();
    res
      .status(201)
      .json({ status: "success", type: "registration", data: savedUser });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: "error", type: "server", message: "Server error" });
  }
});

app.post("/Login", async (req, res) => {
  console.log(req.body);
  const pass = req.body.password;
  console.log("🚀 ~ app.post ~ pass:", pass);
  const email = req.body.email;
  console.log("🚀 ~ app.post ~ email:", email);
  // if (pass && email) {
  let user = await User.findOne({ email: req.body.email });
  console.log("🚀 ~ app.post ~ user:", user);
  if (user) {
    res.send(user);
  } else {
    res.send({ result: "No User Found" });
  }
  // } else {
  //   res.send({ result: "Wrong Entry" });
  // }
});

/* MULTER */

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Recipe model

app.post("/AddRecipe", upload.single("photo"), async (req, res) => {
  console.log("=====================>");
  try {
    console.log(req.file);

    const { error } = Recipe.validate(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    const recipe = new Recipe({
      ...req.body,
      photo: req.file ? req.file.path : null,
    });

    const result = await recipe.save();
    console.log(result);

    res.send(result);
  } catch (error) {
    console.error("Error saving recipe:", error);
    res
      .status(500)
      .send(
        "An error occurred while adding the recipe. Please try again later."
      );
  }
});

/* Get Recipe Api */

app.get("/Recipe", async (req, res) => {
  let recipe = await Recipe.find();
  if (recipe.length > 0) {
    res.send(recipe);
  } else {
    res.send({ result: "No Recipe" });
  }
});

/* Get Recipe by Id Api in full page  */

app.get("/Recipe/:id", async (req, res) => {
  console.log("=============>");
  const id = req.params.id;
  try {
    let recipe = await Recipe.findById(id);
    if (recipe) {
      res.send(recipe);
      console.log("----->");
    } else {
      res.status(404).send({ error: "Recipe not found" });
    }
  } catch (error) {
    console.error("Error retrieving recipe:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Backend route to fetch a single recipe by ID
app.get("/saved-recipes/:id", async (req, res) => {
  const id = req.params.id;
  try {
    let recipe = await Save.findById(id);
    if (recipe) {
      res.status(200).json(recipe);
    } else {
      res.status(404).json({ error: "Recipe not found" });
    }
  } catch (error) {
    console.error("Error retrieving recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* SEARCH */

app.get("/search/:key", async (req, res) => {
  let result = await Recipe.find({
    $or: [
      { name: { $regex: req.params.key } },
      { title: { $regex: req.params.key } },
      { recipeTitle: { $regex: req.params.key } },
    ],
  });
  res.send(result);
});

/* Post Save  */
app.post("/save", async (req, res) => {
  try {
    const { photo, recipeTitle, about, keywords, steps, ingredients } =
      req.body;

    if (
      !photo ||
      !recipeTitle ||
      !about ||
      !keywords ||
      !steps ||
      !ingredients
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newSave = new Save({
      photo,
      recipeTitle,
      about,
      keywords,
      steps,
      ingredients,
    });

    const savedRecipe = await newSave.save();

    const savedRecipeId = savedRecipe._id;

    res
      .status(201)
      .json({ message: "Recipe saved successfully", id: savedRecipeId });
    console.log("Recipe saved successfully with ID:", savedRecipeId);
  } catch (err) {
    console.error("Error saving recipe", err);
    res.status(500).json({ message: "Error saving recipe" });
  }
});

/* Get Save  */

app.get("/saved-recipes", async (req, res) => {
  try {
    const savedRecipes = await Save.find();

    const formattedRecipes = savedRecipes.map((recipe) => ({
      _id: recipe._id,
      photo: recipe.photo,
      recipeTitle: recipe.recipeTitle,
      about: recipe.about,
      keywords: recipe.keywords,
      steps: recipe.steps,
      ingredients: recipe.ingredients,
    }));

    res.status(200).json(formattedRecipes);
  } catch (err) {
    console.error("Error fetching saved recipes", err);
    res.status(500).json({ message: "Error fetching saved recipes" });
  }
});

/* Delete */

app.delete("/saved-recipes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedRecipe = await Save.findByIdAndDelete(id);
    if (!deletedRecipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (err) {
    console.error("Error deleting recipe", err);
    res.status(500).json({ message: "Error deleting recipe" });
  }
});

/* DELETE */

app.delete("/recipes/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    const deletedRecipe = await Recipe.findByIdAndDelete(recipeId);

    if (deletedRecipe) {
      res.status(200).json({ message: "Recipe deleted successfully" });
    } else {
      res.status(404).json({ error: "Recipe not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* EDIT */

app.put("/recipes/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    const updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, req.body, {
      new: true,
    });
    res.status(200).json(updatedRecipe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
// app.listen(5000, console.log("Server is running"));
app.listen(PORT, () => {
  console.log(`Server Is listening On http://localhost:${PORT}`);
});

/* const express = require("express");
const cors = require("cors");
const Save = require("./Database/save");

require("./Database/Config");
const User = require("./Database/User");
const Recipe = require("./Database/Recipe");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.get("/", (req, res) => {
  res.send("This is Backend");
});

app.post("/Register", async (req, res) => {
  let user = new User(req.body);
  let result = await user.save();
  res.send(result);
});

app.post("/Login", async (req, res) => {
  console.log(req.body);
  if (req.body.password && req.body.email) {
    let user = await User.findOne(req.body);
    if (user) {
      res.send(user);
    } else {
      res.send({ result: "No User Found" });
    }
  } else {
    res.send({ result: "Wrong Entry" });
  }
});

/* MULTER 

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Recipe model

app.post("/AddRecipe", upload.single("photo"), async (req, res) => {
  console.log("=====================>");
  try {
    console.log(req.file);

    const { error } = Recipe.validate(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    const recipe = new Recipe({
      ...req.body,
      photo: req.file ? req.file.path : null,
    });

    const result = await recipe.save();
    console.log(result);

    res.send(result);
  } catch (error) {
    console.error("Error saving recipe:", error);
    res
      .status(500)
      .send(
        "An error occurred while adding the recipe. Please try again later."
      );
  }
});

/* Get Recipe Api 

app.get("/Recipe", async (req, res) => {
  let recipe = await Recipe.find();
  if (recipe.length > 0) {
    res.send(recipe);
  } else {
    res.send({ result: "No Recipe" });
  }
});

/* Get Recipe by Id Api 

app.get("/Recipe/:id", async (req, res) => {
  console.log("=============>");
  const id = req.params.id;
  try {
    let recipe = await Recipe.findById(id);
    if (recipe) {
      res.send(recipe);
      console.log("----->");
    } else {
      res.status(404).send({ error: "Recipe not found" });
    }
  } catch (error) {
    console.error("Error retrieving recipe:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

/* SEARCH 

app.get("/search/:key", async (req, res) => {
  let result = await Recipe.find({
    $or: [
      { name: { $regex: req.params.key } },
      { title: { $regex: req.params.key } },
      { recipeTitle: { $regex: req.params.key } },
    ],
  });
  res.send(result);
});

/* Post Save  
app.post("/save", async (req, res) => {
  try {
    const { photo, recipeTitle, about, keywords, steps, ingredients } =
      req.body;

    if (
      !photo ||
      !recipeTitle ||
      !about ||
      !keywords ||
      !steps ||
      !ingredients
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newSave = new Save({
      photo,
      recipeTitle,
      about,
      keywords,
      steps,
      ingredients,
    });

    const savedRecipe = await newSave.save();

    const savedRecipeId = savedRecipe._id;

    res
      .status(201)
      .json({ message: "Recipe saved successfully", id: savedRecipeId });
    console.log("Recipe saved successfully with ID:", savedRecipeId);
  } catch (err) {
    console.error("Error saving recipe", err);
    res.status(500).json({ message: "Error saving recipe" });
  }
});

/* Get Save  */

/* app.get("/saved-recipes", async (req, res) => {
  try {
    const savedRecipes = await Save.find();

    const formattedRecipes = savedRecipes.map((recipe) => ({
      _id: recipe._id,
      photo: recipe.photo,
      recipeTitle: recipe.recipeTitle,
      about: recipe.about,
      keywords: recipe.keywords,
      steps: recipe.steps,
      ingredients: recipe.ingredients,
    }));

    res.status(200).json(formattedRecipes);
  } catch (err) {
    console.error("Error fetching saved recipes", err);
    res.status(500).json({ message: "Error fetching saved recipes" });
  }
}); 

app.get("/saved-recipes/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract the ID from the request parameters
    const savedRecipe = await Save.findById(id); // Fetch the recipe by its ID

    if (!savedRecipe) {
      return res.status(404).json({ message: "Saved recipe not found" });
    }

    const formattedRecipe = {
      _id: savedRecipe._id,
      photo: savedRecipe.photo,
      recipeTitle: savedRecipe.recipeTitle,
      about: savedRecipe.about,
      keywords: savedRecipe.keywords,
      steps: savedRecipe.steps,
      ingredients: savedRecipe.ingredients,
    };

    res.status(200).json(formattedRecipe); // Send the formatted recipe as response
  } catch (err) {
    console.error("Error fetching saved recipe by ID", err);
    res.status(500).json({ message: "Error fetching saved recipe by ID" });
  }
});

/* Delete 

app.delete("/saved-recipes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedRecipe = await Save.findByIdAndDelete(id);
    if (!deletedRecipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (err) {
    console.error("Error deleting recipe", err);
    res.status(500).json({ message: "Error deleting recipe" });
  }
});

/* DELETE 

app.delete("/recipes/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    const deletedRecipe = await Recipe.findByIdAndDelete(recipeId);

    if (deletedRecipe) {
      res.status(200).json({ message: "Recipe deleted successfully" });
    } else {
      res.status(404).json({ error: "Recipe not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* EDIT 

app.put("/recipes/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    const updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, req.body, {
      new: true,
    });
    res.status(200).json(updatedRecipe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(5000, console.log("Server is running"));
 */
