import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CustomerSupportQuestion {
  offerId: string;
  question: string;
}

export class OfferGeniusService {
  constructor(private readonly api = new OpenAIApi(configuration)) {}

  async fetchPublicOffer(offerId: string) {

  }

  async answerCustomerSupportQuestion({ offerId, question  }: CustomerSupportQuestion) {}
}
