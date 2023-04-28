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
  constructor(
    private readonly isProdEnv = true,
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
    const slimOffer = this.transformOffer(offer);

    console.log("Answering query for: ", slimOffer.name);
    console.log("Query token count: ", this.countToken(JSON.stringify(slimOffer)))
    console.log("Using prompt: ", offerGeniusPrompt(slimOffer)); 

    const answer = await this.api.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: offerGeniusPrompt(slimOffer),
        },
        { role: "user", content: question },
      ],
    });

    const answerContent = answer.data.choices[0].message!.content

    const quotation = await this.api.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      messages: [
        { role: "system", content: offerGeniusPrompt(slimOffer) },
        { role: "user", content: question },
        { role: "assistant", content: answerContent },
        { role: "user", content: offerGeniusQuotationPrompt() }
      ],
    })
    
    const quotationContent = quotation.data.choices[0].message!.content

    const hasInvalidReference = quotationContent.toLocaleLowerCase() === "no." 
                            || quotationContent.toLocaleLowerCase() == "\"no\""
                            || quotationContent.toLocaleLowerCase().startsWith("\"no.\"")
                            || quotationContent.toLocaleLowerCase().startsWith("\"no\"")

    return {
      answers: [
        {
          answer: answerContent,
          reference: hasInvalidReference ? null : quotationContent
        }
      ]
    };
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

  transformOffer(offer: any): any {
    const slimPackages: object[] = []
    for (const packageId in offer.packages) {
      const offerPackage = offer.packages[packageId]
      slimPackages.push({
        name: offerPackage.name,
        copy: offerPackage.copy,
        includedGuestsLabel: offerPackage.includedGuestsLabel,
        inclusions: offerPackage.inclusions
      })
    }

    const slimRoomTypes: object[] = []
    for (const roomTypeId in offer.roomTypes) {
      const roomType = offer.roomTypes[roomTypeId]
      slimRoomTypes.push({
        name: roomType.name,
        description: roomType.description,
        amenityGroups: roomType.amenityGroups,
        additionalGuestAmountDescription: roomType.additionalGuestAmountDescription,
        sizeSquareMeters: roomType.sizeSqm
      })
    }

    return {
      name: offer.name,
      copy: offer.copy,
      // packages: slimPackages,
      property: {
        name: offer.property.name,
        address: offer.property.address,
        childrenPolicy: offer.property.childrenPolicy,
        ageCategories: offer.property.ageCategories,
        reviews: offer.property.reviews
      },
      roomTypes: slimRoomTypes,
      location: offer.location,
      tags: offer.tags,
      // inclusions: offer.inclusions
    }
  }

  countToken(message: string): number {
    const encoded = encode(message);
    return encoded.length;
  }
}
