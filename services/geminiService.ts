import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are an expert Ableton Live Certified Trainer and Sound Designer.
Your task is to generate precise, step-by-step "Recipes" for creating specific sounds, effects, or workflows in Ableton Live.

Key Guidelines:
1. **Terminology**: Use exact Ableton Live terminology.
2. **Formatting**:
   - Use **Bold** for Device Names and distinct UI sections.
   - Use *Italics* for specific parameter knobs or sliders.
   - Use > for important tips or hotkeys.
3. **Structure**:
   - **Concept**: Brief explanation of the sound/technique.
   - **Core Devices**: List of devices needed.
   - **MIDI Enhancements**: Suggest 1-2 MIDI effects.
   - **Step-by-Step Guide**: Numbered list of actions.
   - **Visual Feedback**: Explain visual monitoring (Spectrum, LFO, etc.).
   - **Macro Mapping**: Suggest 4-8 useful macros for a Rack.

4. **Style & Complexity Adherence**:
   - Adjust writing style based on "Configuration Constraints" (1-10) for Complexity, Jargon, and Depth.

5. **Audio Effect Racks & Chains**:
   - Propose specific **Audio Effect Rack** structures.
   - Define Chain Lists and Macro mappings.

6. **Arrangement & Variations**:
   - Provide standard bar counts and automation moves.

7. **VERSION COMPATIBILITY & CONSTRAINTS (CRITICAL)**:
   - **IF LIVE 10**: 
     - **FORBIDDEN**: Do not mention Roar, Meld, Hybrid Reverb, Spectral Resonator, PitchLoop89, Drift, Comping, MPE, or Probability/Chance tools in MIDI clips.
     - **SUBSTITUTES**: Use "Ping Pong Delay" or "Simple Delay" instead of the unified "Delay". Use "Redux" (Legacy) terminology. Use standard Reverb instead of Hybrid.
     - **workflow**: Focus on the classic Clip View and Arrangement.
   - **IF LIVE 11**:
     - Allowed: Comping, MPE, Hybrid Reverb, Spectral Resonator.
     - Forbidden: Roar, Meld, Live 12 MIDI Generators.
   - **IF LIVE 12**:
     - Allowed: All features including Roar, Meld, Granulator III, MIDI Tools (Seed/Shape/Rhythm).

8. **Tone**: Professional, encouraging, technical but accessible.
`;

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

// Helper to handle base64 strings
const prepareImagePart = (base64Data: string, mimeType = "image/png") => ({
  inlineData: {
    mimeType,
    data: base64Data,
  },
});

export const transcribeAudio = async (audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> => {
    const ai = getClient();
    const model = 'gemini-3-flash-preview'; // Required for audio transcription

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: audioBase64 } },
                    { text: "Transcribe this audio exactly as spoken." }
                ]
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Transcription error:", error);
        throw error;
    }
}

export const editImage = async (imageBase64: string, prompt: string): Promise<string> => {
    const ai = getClient();
    const model = 'gemini-2.5-flash-image'; // Required for image editing

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    prepareImagePart(imageBase64),
                    { text: prompt }
                ]
            }
        });

        // Iterate to find the image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data; // Return base64 string of new image
            }
        }
        throw new Error("No image generated");
    } catch (error) {
        console.error("Image editing error:", error);
        throw error;
    }
}

export const generateImage = async (prompt: string): Promise<string> => {
    const ai = getClient();
    const model = 'gemini-2.5-flash-image'; 

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { text: prompt }
                ]
            }
        });

        // Iterate to find the image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data; // Return base64 string
            }
        }
        throw new Error("No image generated");
    } catch (error) {
        console.error("Image generation error:", error);
        throw error;
    }
}

export const generateAbletonGuideStream = async (
  prompt: string,
  imageBase64: string | null,
  onChunk: (text: string) => void
) => {
  const ai = getClient();
  // Switch model based on presence of image
  // Basic Text Tasks: 'gemini-3-flash-preview'
  // Complex Text/Image Analysis: 'gemini-3-pro-preview'
  const model = imageBase64 ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

  try {
    const parts: any[] = [{ text: imageBase64 ? `Analyze this image and ${prompt}` : `Create an Ableton Live guide for: ${prompt}` }];
    
    if (imageBase64) {
        parts.unshift(prepareImagePart(imageBase64));
    }

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};