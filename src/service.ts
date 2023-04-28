import { Configuration, OpenAIApi } from "openai";
import { encode } from "gpt-3-encoder";
import { offerGeniusPrompt, offerGeniusQuotationPrompt } from "./prompts";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CustomerSupportQuestion {
  offerId: string;
  question: string;
}

export class OfferGeniusService {
  constructor(private readonly api = new OpenAIApi(configuration)) {}

  async fetchOffer(offerId: string): Promise<any> {
    const url = `https://api.luxuryescapes.com/api/v2/public-offers/${offerId}?flightOrigin=SYD&region=AU&allPackages=false&brand=luxuryescapes`;
    const response = await fetch(url);
    const data = await response.json();
    return data.result;
  }

  async answerCustomerSupportQuestion({
    offerId,
    question,
  }: CustomerSupportQuestion) {
    const offer = await this.fetchOffer(offerId);

    console.log("Answering query for: ", offer.name);
    console.log("Using prompt: ", offerGeniusPrompt(offer.copy)); 

    const answer = await this.api.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: offerGeniusPrompt(offer.copy),
        },
        { role: "user", content: question },
      ],
    })

    const answerContent = answer.data.choices[0].message!.content

    const quotation = await this.api.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      messages: [
        { role: "system", content: offerGeniusPrompt(offer.copy) },
        { role: "user", content: question },
        { role: "assistant", content: answerContent },
        { role: "user", content: offerGeniusQuotationPrompt() }
      ],
    })

    console.log(quotation.data.choices)
    const quotationContent = quotation.data.choices[0].message!.content

    return {
      answers: [
        {
          answer: answerContent,
          reference: quotationContent.toLocaleLowerCase() === "no." ? null : quotationContent
        }
      ]
    };
  }

  countToken(message: string): number {
    const encoded = encode(message);
    return encoded.length;
  }
}
