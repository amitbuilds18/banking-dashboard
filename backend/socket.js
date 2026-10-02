import { Server } from "socket.io";

let io = null;

export function initSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // Join user private notification & balance channel
    socket.on("join_user", (userId) => {
      if (userId) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        socket.emit("connection_status", {
          status: "connected",
          room: roomName,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Leave user room
    socket.on("leave_user", (userId) => {
      if (userId) {
        socket.leave(`user_${userId}`);
      }
    });

    // Join payment link room for live checkout updates
    socket.on("join_payment_link", (linkCode) => {
      if (linkCode) {
        const roomName = `link_${linkCode}`;
        socket.join(roomName);
        socket.emit("link_connected", { linkCode });
      }
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// Emit event to a specific logged-in user's room
export function emitToUser(userId, event, payload) {
  try {
    if (io && userId) {
      io.to(`user_${userId}`).emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Socket emitToUser error:", err.message);
  }
}

// Emit update when a payment link is paid
export function emitPaymentLinkUpdate(linkCode, payload) {
  try {
    if (io && linkCode) {
      io.to(`link_${linkCode}`).emit("payment_link_settled", {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Socket emitPaymentLinkUpdate error:", err.message);
  }
}

// Broadcast to all connected clients
export function broadcastGlobal(event, payload) {
  try {
    if (io) {
      io.emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Socket broadcastGlobal error:", err.message);
  }
}

export default {
  initSocket,
  getIO,
  emitToUser,
  emitPaymentLinkUpdate,
  broadcastGlobal,
};
