import express from "express";
const port = process.env.PORT || 4000;

export function startServer() {
  return app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

const app = express();

app.get("/", (req, res) => {
  res.send("Endpoint")
});
