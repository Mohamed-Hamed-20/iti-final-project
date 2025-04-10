import SocketManager from "./socket";

SocketManager.on("received-message", (socket, data, userId) => {
    console.log(`User ${userId} sent a chat message: `, data);
    
});
