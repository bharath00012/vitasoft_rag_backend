"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const upload_route_1 = __importDefault(require("./routes/upload.route"));
const query_route_1 = __importDefault(require("./routes/query.route"));
const session_route_1 = __importDefault(require("./routes/session.route"));
const db_1 = require("./config/db"); // ADD THIS
dotenv_1.default.config();
(0, db_1.connectDB)(); // ADD THIS
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/upload", upload_route_1.default);
app.use("/query", query_route_1.default);
app.use("/session", session_route_1.default);
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
