const mongoose = require("mongoose");
const { addChatToUsers } = require("./users");
const messageSchema = new mongoose.Schema({
  sender: { type: String },
  message: String,
  date: { type: Date, default: new Date() },
});
const messagesSchema = new mongoose.Schema({
  messages: [messageSchema],
  peopleInChat: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  date: { type: Date, default: new Date() },
});
const massages = mongoose.model("messages", messagesSchema);
const message = mongoose.model("message", messageSchema);

async function createNewChat(ids) {
  const newChat = new massages({
    messages: [],
    peopleInChat: ids,
  });
  const chat = await newChat.save();
  addChatToUsers(chat._id, ids);
}
async function getChat(id) {
  const chat = await massages.findById(id).populate("peopleInChat", "-_id");
  return chat;
}

async function addMessages(chatId, massage) {
  if (chatId === "") return false;
  const chat = await massages.findById(chatId);
  if (!chat) return false;
  chat.messages.push(new message(massage));
  return chat.save();
}
module.exports.createNewChat = createNewChat;
module.exports.addMessages = addMessages;
module.exports.getChat = getChat;
