// Megan Rochella - 0706022210028
// ISSG - HASH (PART 1 AND 2)

const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
});

let username = "";

// Function to create hash from a message
function hashMessage(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
}

socket.on("connect", () => {
    console.log("Connected to the server");

    rl.question("Enter your username: ", (input) => { // Input username
        username = input;
        console.log(`Welcome, ${username} to the chat`);
        rl.prompt();

        rl.on("line", (message) => { // Enter clicked
            if (message.trim()) { // Delete space
                const hash = hashMessage(message); // Use hashMessage function
                socket.emit("message", { username, message, hash });
            }
            rl.prompt();
        });
    });
});

socket.on("message", (data) => {
    const { username: senderUsername, message: senderMessage, hash } = data;

    // Verify message integrity by recalculating the hash
    const calculatedHash = hashMessage(senderMessage);
    if (calculatedHash === hash) {
        if (senderUsername !== username) {
            console.log(`${senderUsername}: ${senderMessage}` + " (Verified Message)");
        }
    } else { 
        if (senderUsername !== username) {
            // SERVER HACKED THE MESSAGE
            console.log(`${senderUsername}: ${senderMessage}` + " (The message may have been changed during transmission)");
        }
    }
    rl.prompt();
});

socket.on("disconnect", () => {
    console.log("Server disconnected, Exiting....");
    rl.close();
    process.exit(0);
});

rl.on("SIGINT", () => {
    console.log("\nExiting...");
    socket.disconnect();
    rl.close();
    process.exit(0);
});