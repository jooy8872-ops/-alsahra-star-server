import express from "express";
import admin from "firebase-admin";
import { AccessToken } from "livekit-server-sdk";

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  )
});

const db = admin.firestore();

app.get("/", (req, res) => {
  res.send("AlSahra Star Server is running");
});

app.post("/get-token", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { roomName } = req.body;

    if (
      typeof roomName !== "string" ||
      !/^[a-zA-Z0-9_-]{1,50}$/.test(roomName)
    ) {
      return res.status(400).json({ error: "Invalid room name" });
    }

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: decoded.uid,
        ttl: "1h"
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    });

    const jwt = await token.toJwt();

    res.json({
      serverUrl: process.env.LIVEKIT_URL,
      token: jwt
    });
  } catch (error) {
    console.error("Token error:", error.message);
    res.status(401).json({ error: "Could not create token" });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
