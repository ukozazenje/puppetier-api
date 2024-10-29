const express = require("express");
const yachtController = require("../controllers/yachtController");
const Router = express.Router();

Router.post("/yachts", yachtController.GetYachts);
Router.post("/yacht", yachtController.GetYacht);

module.exports = Router;
