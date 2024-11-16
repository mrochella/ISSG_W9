// Megan Rochella - 0706022210028
// ISSG - ENCRYPTION (PART 4)

const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer();
const io = socketIo(server);

const users = new Map();

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  // Send the current list of users to the newly connected client
  socket.emit("init", Array.from(users.entries()));

  socket.on("registerPublicKey", (data) => {
    const { username, publicKey } = data;
    users.set(username, { publicKey, socketId: socket.id });
    console.log(`${username} registered with public key.`);

    // Notify all clients of the new user
    io.emit("newUser  ", { username, publicKey });
  });

  socket.on("message", (data) => {
    const { username, targetUsername, message } = data;

    // Find the target user based on the username
    const targetUser  = users.get(targetUsername);
    if (targetUser ) {
      io.to(targetUser .socketId).emit("message", { username, message, targetUsername });
    }

    for (const [user, { socketId }] of users.entries()) {
      // Broadcasts a message to non-target users.
      if (user !== targetUsername && user !== username) {
        io.to(socketId).emit("message", { username, message });
      }
    }
  });

  socket.on("disconnect", () => {
    // Remove the user from the users map on disconnect
    for (const [username, { socketId }] of users.entries()) {
      if (socketId === socket.id) {
        users.delete(username);
        console.log(`${username} disconnected`);
        break;
      }
    }
  });
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});