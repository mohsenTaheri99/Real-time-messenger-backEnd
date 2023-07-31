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
  connection.on("close", async () => {
    console.log(connection.state);
    for (const property in onlineUser) {
      if (onlineUser[property].connection == connection) {
        const user = await users.findOne({
          username: onlineUser[property].name,
        });

        const userContacts = [];
        user.inbox.forEach((box) => {
          box.contactNames.forEach((contact) => {
            if (contact !== onlineUser[property].name) {
              userContacts.push(contact);
            }
          });
        });

        for (let index = 0; index < userContacts.length; index++) {
          const username = userContacts[index];
          const user = await users.findOne({ username: username });
          if (onlineUser[user._id + ""]) {
            onlineUser[user._id + ""].connection.send(
              JSON.stringify({
                method: "thisUserIsOffline",
                username: onlineUser[property].name,
              })
            );
          }
        }

        delete onlineUser[property];
      }
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

          const user = await users.findById(result.user._id);
          const userContacts = [];
          user.inbox.forEach((box) => {
            box.contactNames.forEach((contact) => {
              if (contact !== result.user.username) {
                userContacts.push(contact);
              }
            });
          });

          for (let index = 0; index < userContacts.length; index++) {
            const username = userContacts[index];
            const user = await users.findOne({ username: username });
            if (onlineUser[user._id + ""]) {
              connection.send(
                JSON.stringify({
                  method: "thisUserIsOnline",
                  username: username,
                })
              );

              onlineUser[user._id + ""].connection.send(
                JSON.stringify({
                  method: "thisUserIsOnline",
                  username: result.user.username,
                })
              );
            }
          }
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
            if (userId + "" !== result.user._id && onlineUser[userId])
              onlineUser[userId].connection.send(
                JSON.stringify({
                  method: "newMessage",
                  sender: result.user.username,
                  message: result.message,
                  chatId: result.chatId,
                })
              );
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
            .select("inbox -_id ");

          const payload = {
            method: "inbox",
            inbox: user.inbox,
            yourUsername: result.user.username,
          };
          connection.send(JSON.stringify(payload));
        }
        break;
      case "StartNewChat":
        {
          const newChat = await createNewChat([result.user._id, result.userId]);
          const user = await users.findById(result.userId).select("-inbox");
          console.log(user);
          const payload = {
            method: "NewChat",
            newChat: newChat,
            inboxUpdate: {
              contactNames: [result.user.username, user.username],
              chats: newChat._id,
            },
          };
          connection.send(JSON.stringify(payload));
          const OtherUserPayload = {
            method: "inboxUpdate",
            inboxUpdate: {
              contactNames: [result.user.username, user.username],
              chats: newChat._id,
            },
          };
          onlineUser[result.userId]?.connection.send(
            JSON.stringify(OtherUserPayload)
          );

          if (onlineUser[result.userId]) {
            onlineUser[result.userId].connection.send(
              JSON.stringify({
                method: "thisUserIsOnline",
                username: result.user.username,
              })
            );
            connection.send(
              JSON.stringify({
                method: "thisUserIsOnline",
                username: user.username,
              })
            );
          }
        }
        break;
      case "SearchInUsers":
        {
          const SearchUsers = await users.find({
            username: {
              $regex: `${result.searchFor}`,
              $options: "i",
            },
          });
          const user = await users.findById(result.user._id).select("inbox");
          const allContact = user.inbox.map((box) => {
            if (box.contactNames[1] === result.user.username) {
              return box.contactNames[0];
            } else {
              return box.contactNames[1];
            }
          });

          const payload = {
            method: "SearchInUsers",
            SearchUsers: SearchUsers.filter((user) => {
              if (user.username === result.user.username) return false;
              if (allContact.includes(user.username)) {
                console.log(user.username);
                return false;
              } else return true;
            }),
          };
          connection.send(JSON.stringify(payload));
        }
        break;

      case "imTyping":
        {
          const chat = await getChat(result.chatId);
          console.log(chat.peopleInChat);
          chat.peopleInChat.forEach((user) => {
            if (user._id + "" !== result.user._id) {
              const payload = {
                method: "isTyping",
                chatId: result.chatId,
              };
              onlineUser[user._id + ""]?.connection.send(
                JSON.stringify(payload)
              );
            }
          });
        }
        break;

      default:
        break;
    }
  });
});
