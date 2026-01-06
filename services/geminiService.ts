
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ViewType } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateAssistantResponse = async (prompt: string, history: any[] = []) => {
  const ai = getAI();
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are OhM, a highly advanced, ultra-accurate and speedy AI assistant. Provide concise, helpful and grounded answers."
    },
  });

  const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Source',
    uri: chunk.web?.uri || '#'
  })) || [];

  return {
    text: response.text || "I'm sorry, I couldn't process that request.",
    sources: groundingSources
  };
};

export const generateImage = async (prompt: string, sourceImage?: { data: string; mimeType: string }, aspectRatio: string = "1:1") => {
  const ai = getAI();
  
  const parts: any[] = [];
  if (sourceImage) {
    parts.push({
      inlineData: {
        data: sourceImage.data,
        mimeType: sourceImage.mimeType
      }
    });
  }
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateVideo = async (
  prompt: string, 
  image?: { imageBytes: string; mimeType: string },
  config: { resolution: '720p' | '1080p', aspectRatio: '16:9' | '9:16' } = { resolution: '720p', aspectRatio: '16:9' }
) => {
  const ai = getAI();
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: image,
    config: {
      numberOfVideos: 1,
      resolution: config.resolution,
      aspectRatio: config.aspectRatio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed to return a URI.");
  
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
