const mongoose = require("mongoose");
mongoose
  .connect("mongodb://localhost/massager")
  .then(() => console.log("Connected to mongoDB..."))
  .catch((err) => console.error("Could not connect to mongoDB...", err));

const {
  updateUser,
  getUserByName,
  getUserById,
  NewUser,
} = require("./models/users");

const { createNewChat, addMessages, getChat } = require("./models/chat");

// NewUser("elahe", "12345");
// createNewChat(["64b70748d1d838cfbb2e9c9a", "64b707510ae49f8b5ac74407"]);
// addMessages("64b707c398d2996b05793d78", {
//   sender: "mohsen",
//   message: "khbi man injam",
//   date: new Date(),
// });
