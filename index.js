const mongoose = require("mongoose");
mongoose
  .connect("mongodb://localhost/massager")
  .then(() => console.log("Connected to mongoDB..."))
  .catch((err) => console.error("Could not connect to mongoDB...", err));

const { createNewChat, addMessages, getChat } = require("./models/chat");
const { users, NewUser } = require("./models/users");

const WebSocketServer = require("websocket").server;
const http = require("http");
const jwt = require("jsonwebtoken");
const { constants } = require("buffer");
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("listening on 9090"));
const wsServer = new WebSocketServer({ httpServer: httpServer });
const onlineUser = {};

wsServer.on("request", (req) => {
  const connection = req.accept(null, req.origin);
  connection.on("resume", () => {
    connection.send(JSON.stringify("you connected"));
    console.log("new connection");
  });
  connection.on("close", () => {
    console.log(connection.state);
    for (const property in onlineUser) {
      if (onlineUser[property].connection == connection)
        delete onlineUser[property];
    }
  });
  connection.on("message", async (message) => {
    const result = JSON.parse(message.utf8Data);
    if (!result.token) return connection.send("no token provide");
    result.user = jwt.verify(result.token, "jtwprvetkey");
    if (!result.user) return connection.send("bad token");

    switch (result.method) {
      case "addMe":
        {
          onlineUser[result.user._id] = {
            name: result.user.username,
            connection: connection,
          };
          connection.send(JSON.stringify("you added"));
        }
        break;
      case "sendMessage":
        {
          const username = result.user.username;
          // message sender chatId
          const message = {
            sender: username,
            message: result.message,
            date: new Date(),
          };
          const chat = await addMessages(result.chatId, message);
          const payload = {
            method: "server receive",
          };
          connection.send(JSON.stringify(payload));

          chat.peopleInChat.forEach((userId) => {
            if (userId !== result.user._id && onlineUser[userId])
              onlineUser[userId].connection.send(JSON.stringify(message));
          });
        }
        break;
      case "getMessage":
        {
          const chat = await getChat(result.chatId);
          const payload = {
            method: "chat",
            chat: chat,
          };
          connection.send(JSON.stringify(payload));
        }
        break;
      case "getInbox":
        {
          const user = await users
            .findById(result.user._id)
            .select("inbox -_id");

          const payload = {
            method: "inbox",
            inbox: user.inbox,
          };
          connection.send(JSON.stringify(payload));
        }
        break;

      default:
        break;
    }
  });
});

// createNewChat(["64b882ba22e29de8c38e5b4e", "64b882c022e29de8c38e5b51"]);
// addMessages("64b707c398d2996b05793d78", {
//   sender: "mohsen",
//   message: "khbi man injam",
//   date: new Date(),
// });

const test = async (id) => {
  const user = await users.findById(id);
  console.log(user.inbox);
  const otherUser = await users.findById(user.inbox[0].contactIds[0]);
  console.log("other one", otherUser);
};

// test("64b87b50b370fcb9ac7acd4a");
