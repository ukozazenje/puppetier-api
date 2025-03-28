const express = require("express");
const planeController = require("../controllers/planeController");
const Router = express.Router();

Router.post("/planes", planeController.GetPlanes);
Router.post("/plane", planeController.GetPlane);

module.exports = Router;
