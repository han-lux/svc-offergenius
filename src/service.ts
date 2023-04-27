import { Configuration, OpenAIApi } from "openai";
import { encode } from "gpt-3-encoder"; 

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

  countToken(message: string): number {
    const encoded = encode(message);
    return encode.length;
  }
}
