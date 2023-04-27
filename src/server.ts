import express from "express";
import { OfferGeniusService } from "./service";
const port = process.env.PORT || 4000;

export function startServer() {
  return app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

const app = express();

app.get("/", (req, res) => {
  const offerGenius = new OfferGeniusService()
  const tokenCount = offerGenius.countToken("Endpoint")
  res.status(200).send({ tokenCount })
});
