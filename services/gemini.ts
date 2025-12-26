
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Language } from "../types";

// Helper to strip data:image/...;base64, prefix
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeUserProfile = async (
  images: { front: string; left: string; right: string },
  lang: Language
): Promise<AnalysisResult> => {
  const ai = getGeminiClient();
  
  const prompt = lang === Language.CN 
    ? "分析这些用户的照片（正面、左侧、右侧）。识别他们的脸型和肤色。根据美学原则，推荐 3 种适合的发型和 3 种适合的眼镜款式。请提供详细的理由。请以 JSON 格式返回结果。注意：JSON 的**键名(Keys)**必须严格保持英文（如 faceShape, skinTone, recommendedHairstyles, name, description, reason, recommendedGlasses, style 等），但所有**值(Values)**的内容必须严格使用简体中文。"
    : "Analyze these user photos (front, left, right). Identify their face shape and skin tone. Based on aesthetic principles, recommend 3 best hairstyles and 3 best glasses styles. Provide detailed reasoning. Return the result in JSON format. Ensure all string **values** are in English, but keep the keys as defined in the schema.";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(images.front) } },
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(images.left) } },
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(images.right) } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          faceShape: { type: Type.STRING },
          skinTone: { type: Type.STRING },
          recommendedHairstyles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          },
          recommendedGlasses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                description: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to analyze images");
  }

  return JSON.parse(response.text) as AnalysisResult;
};

export const generateMakeoverImage = async (
  frontImage: string,
  selection: {
    hairstyle?: { name: string; description: string };
    glasses?: { style: string; description: string };
  },
  lang: Language
): Promise<string> => {
  const ai = getGeminiClient();

  let makeoverInstructions = "";
  if (selection.hairstyle) {
    makeoverInstructions += lang === Language.CN
      ? `\n1. 发型必须改为：${selection.hairstyle.name} (${selection.hairstyle.description})。`
      : `\n1. Hairstyle must be changed to: ${selection.hairstyle.name} (${selection.hairstyle.description}).`;
  } else {
    makeoverInstructions += lang === Language.CN
      ? `\n1. 保持原有发型不变。`
      : `\n1. Keep the original hairstyle unchanged.`;
  }

  if (selection.glasses) {
    makeoverInstructions += lang === Language.CN
      ? `\n2. 佩戴眼镜：${selection.glasses.style} (${selection.glasses.description})。`
      : `\n2. Wear glasses: ${selection.glasses.style} (${selection.glasses.description}).`;
  } else {
     makeoverInstructions += lang === Language.CN
      ? `\n2. 如果原图中没有眼镜，则不戴眼镜；如果原图有眼镜，保持原样。`
      : `\n2. If there are no glasses in the original image, do not add them; otherwise keep original.`;
  }

  const prompt = lang === Language.CN
    ? `基于这张人像照片，生成一张高写实、专业摄影级别的照片。人物必须保持是同一个人（面部特征不变），但根据以下指令调整造型：
       ${makeoverInstructions}
       保持自然的光线和肤色质感。只改变上述指定的特征，其他保持原样。`
    : `Based on this portrait photo, generate a hyper-realistic, professional photography quality image. The person must remain the same identity (facial features unchanged), but adjust the look according to the following instructions:
       ${makeoverInstructions}
       Maintain natural lighting and skin texture. Only change the specified features, keep others as original as possible.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(frontImage) } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};
