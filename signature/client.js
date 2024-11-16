// Megan Rochella - 0706022210028
// ISSG - SIGNATURE (PART 3)

const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ", 
});

let registeredUsername = "";
let username = "";
const users = new Map();
let privateKey;
let publicKey;

// Function to generate RSA keys
function generateKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

// Generate keys for the user
const keys = generateKeys();
privateKey = keys.privateKey;
publicKey = keys.publicKey;

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    registeredUsername = input;
    console.log(`Welcome, ${username} to the chat`);

    // Send the public key to the server with the username
    socket.emit("registerPublicKey", {
      username,
      publicKey,
    });
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        // Impersonate
        if ((match = message.match(/^!impersonate (\w+)$/))) {
          username = match[1];
          console.log(`Now impersonating as ${username}`);
        } else if (message.match(/^!exit$/)) {
          username = registeredUsername;
          console.log(`Now you are ${username}`);
        } else {
          // Before sending a message, the client signs it using their private key
          const sign = crypto.createSign("SHA256");
          sign.update(message);
          sign.end();
          const signature = sign.sign(privateKey, "hex");

          // The signature is sent along with the message
          socket.emit("message", { username, message, signature });
        }
      }
      rl.prompt();
    });
  });
});

// Event newUser
socket.on("init", (keys) => {
  keys.forEach(([user, key]) => users.set(user, key));
  console.log(`\nThere are currently ${users.size} users in the chat`);
  rl.prompt();
});

socket.on("newUser", (data) => {
  const { username, publicKey } = data;
  users.set(username, publicKey);
  console.log(`${username} join the chat`);
  rl.prompt();
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage, signature } = data;
  
  // Get the sender's public key
  const senderPublicKey = users.get(senderUsername);

  // Verify the signature if we have the sender's public key
  if (senderPublicKey) {
    const verify = crypto.createVerify("SHA256");
    verify.update(senderMessage);
    verify.end();
    const isAuthentic = verify.verify(senderPublicKey, signature, "hex");

    // Display the message if it is authentic
    if (isAuthentic) {
      // Display the message if it's from another user
      if (senderUsername !== username) {
        console.log(`${senderUsername}: ${senderMessage}`);
      }
    // Display the message if it is not authentic
    } else {
      // Display the message if it's from another user
      if (senderUsername !== username) {
        console.log(`${senderUsername}: ${senderMessage} (WARNING: This user is fake!)`);
      }
    }
  // Display the message public key not found
  } else {
    console.log(`${senderUsername}: ${senderMessage} (public key not found)`);
  }
  rl.prompt();
});

// Server disconnect
socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});