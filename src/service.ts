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
    })

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
      packages: slimPackages,
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
      inclusions: offer.inclusions
    }
  }

  countToken(message: string): number {
    const encoded = encode(message);
    return encoded.length;
  }
}
