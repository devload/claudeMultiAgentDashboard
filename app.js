const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/command", require("./routes/command"));
app.use("/api/config", require("./routes/config"));
app.use("/api/status", require("./routes/status"));
app.use("/api/terminal", require("./routes/terminal"));
app.use("/api/agents", require("./routes/agents"));
app.use("/logs", require("./routes/logs"));

module.exports = app;
