const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const inboxSchema = new mongoose.Schema({
  contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  chats: { type: mongoose.Schema.Types.ObjectId, ref: "messages" },
});

const usersSchema = new mongoose.Schema({
  username: { type: String, require: true },
  password: { type: String, require: true },
  date: { type: Date, default: new Date() },
  inbox: [inboxSchema],
});

usersSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { username: this.username, _id: this._id },
    "jtwprvetkey"
  );
  return token;
};
const inbox = mongoose.model("inbox", inboxSchema);
const users = mongoose.model("users", usersSchema);

async function NewUser(username, hash) {
  let user = await users.findOne({ username: username });
  if (user) return false;

  user = new users({
    username: username,
    password: hash,
    chat: [],
  });
  await user.save();
  const token = user.generateAuthToken();

  return await user.save();
}

async function updateUser(username, newUser, newHash) {
  const updatedUser = await users.findByIdAndUpdate(
    { username: username },
    {
      username: newUser,
      password: newHash,
    }
  );
  return await updatedUser.save();
}

async function getUserByName(username) {
  const user = await users.findOne({ username: username });
  if (!user) return false;
  return await user.save();
}

async function getUserById(id) {
  const user = await users.findById({ _id: id });
  if (!user) return false;

  return await user.save();
}

async function addChatToUsers(chatId, ids) {
  ids.forEach(async (u) => {
    const contactIds = ids.splice(ids.indexOf(u), 1);
    const user = await getUserById(u);
    if (!user) return false;
    user.inbox.push(
      new inbox({
        contactIds: contactIds,
        chats: chatId,
      })
    );

    user.save();
  });
  return true;
}

module.exports.updateUser = updateUser;
module.exports.getUserByName = getUserByName;
module.exports.getUserById = getUserById;
module.exports.addChatToUsers = addChatToUsers;
module.exports.NewUser = NewUser;
