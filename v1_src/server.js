const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ===============================
   MIDDLEWARES
================================ */
app.use(cors());
app.use(express.json());

/* ===============================
   BASIC HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NEXORA backend is running 🚀",
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});
