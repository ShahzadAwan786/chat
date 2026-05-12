const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const connectDb = require("./config/dbConnect");
const authRoute = require("./routes/auth-route");
const chatRouter = require("./routes/chat-route");
const statusRouter = require("./routes/status-route");
const initializeSocket = require("./services/sockets-services");

dotenv.config();

const app = express();
const PORT = process.env.PORT;

const corsOption = {
  origin: [
    `http://localhost:5173`,
    `https://whatsapp-clone-three-pi.vercel.app`,
  ],
  credentials: true,
};

app.use(cors(corsOption));

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

connectDb();

const server = http.createServer(app);
const io = initializeSocket(server);

app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});
app.use("/api/auth", authRoute);
app.use("/api/chats", chatRouter);
app.use("/api/status", statusRouter);

server.listen(PORT, async () => {
  console.log(`server running on port ${PORT}`);
});
