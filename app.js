const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const yachtRouter = require("./routes/yachtsRouter")
const planeRouter = require("./routes/planesRouter")

const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// { credentials: true, origin: "http://192.168.100.117" }
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// app.use("/api/v1/scrape", yachtRouter);
app.use("/api/v1/scrape", planeRouter);

app.all("*", (req, res, next) => {
  next(
    new AppError(`this route ${req.originalUrl} doesn't exist on server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
