import express from "express";
import { OfferGeniusService } from "./service"
const port = process.env.PORT || 4000

export function startServer() {
  return app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
  })
}

const app = express();

app.get("/", async (req, res) => {
  const { question = '', offerId = '0062y000003GPzRAAW' } = req.query as Record<string, string>;
  const bearerToken = req.headers.authorization;
  const offerGenius = new OfferGeniusService()
  const answer = await offerGenius.answerCustomerSupportQuestion({ question, offerId }, bearerToken)
  const tokenCount = offerGenius.countToken(question)
  res.status(200).send({ tokenCount, answer })
});
