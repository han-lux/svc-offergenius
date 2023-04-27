import { Configuration, OpenAIApi } from "openai";
import { encode } from "gpt-3-encoder";
import { offerGeniusPrompt } from "./prompts";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CustomerSupportQuestion {
  offerId: string;
  question: string;
}

export class OfferGeniusService {
  constructor(
    private readonly isProdEnv = false,
    private readonly api = new OpenAIApi(configuration),
    private readonly offersCache = new Map<string, string>()
  ) {}


  async fetchOffer(offerId: string, token?: string): Promise<any> {
    if (this.offersCache.has(offerId)) {
      return this.offersCache.get(offerId);
    }
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', token);
    }
    // const url = !this.isProdEnv ? `https://cdn.test.luxuryescapes.com/api/offers/${offerId}` : `https://api.luxuryescapes.com/api/v2/public-offers/${offerId}?flightOrigin=SYD&region=AU&allPackages=false&brand=luxuryescapes`;
    const url = !this.isProdEnv ? `https://cdn.test.luxuryescapes.com/api/v2/public-offers/${offerId}?flightOrigin=SYD&region=AU&allPackages=false&brand=luxuryescapes` : `https://api.luxuryescapes.com/api/v2/public-offers/${offerId}?flightOrigin=SYD&region=AU&allPackages=false&brand=luxuryescapes`;
    const response = await fetch(url, {
      headers
    });
    const data = await response.json();
    if (data) {
      this.offersCache.set(offerId, data.result);
    }
    return data.result;
  }

  async answerCustomerSupportQuestion({
    offerId,
    question,
  }: CustomerSupportQuestion, token?: string) {
    const offer = await this.fetchOffer(offerId, token);
    console.log(offer);
    const humanReadablePrompt = offerGeniusPrompt(
      this.translate(this.isProdEnv ? offer.copy : offer.copy),
      offer.name
    );

    console.log("Answering query for: ", offer.name);
    console.log("Using prompt: ", humanReadablePrompt);

    const answer = await this.api.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: humanReadablePrompt,
        },
        { role: "user", content: question },
      ],
    });

    console.log(answer.data.choices[0].message?.content);

    try {
      return JSON.parse(answer.data.choices[0].message!.content).answers;
    } catch (error) {
      console.log(error);
      return {
        answer:
          "There was an error trying to answer this question. Please try again",
        error,
      };
    }
  }

  translate(data: any): string {
    if (!data) {
      return data;
    }
    return Object.entries(data)
      .filter(([key, val]) => !!key && !!val)
      .reduce(
        (summary, [key, val]) =>
          `${summary}\n${key} is "${
            typeof val === "object" ? `\n--\n${this.translate(val)}` : val
          }"\n`,
        ""
      );
  }

  countToken(message: string): number {
    const encoded = encode(message);
    return encoded.length;
  }
}
