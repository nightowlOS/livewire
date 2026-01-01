import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are an expert Ableton Live 12 Certified Trainer and Sound Designer.
Your task is to generate precise, step-by-step "Recipes" for creating specific sounds, effects, or workflows in Ableton Live 12.

Key Guidelines:
1. **Terminology**: Use exact Ableton Live 12 terminology (e.g., "Simpler", "Sampler", "Wavetable", "Roar", "Meld", "Echo", "Hybrid Reverb").
2. **Formatting**:
   - Use **Bold** for Device Names and distinct UI sections.
   - Use *Italics* for specific parameter knobs or sliders.
   - Use > for important tips or hotkeys.
3. **Structure**:
   - **Concept**: Brief explanation of the sound/technique.
   - **Core Devices**: List of devices needed.
   - **MIDI Enhancements**: Suggest 1-2 MIDI effects (Arpeggiator, Chord, Scale, Note Echo) to drive the sound musically.
   - **Step-by-Step Guide**: Numbered list of actions.
   - **Visual Feedback**: Explain how to use devices like **LFO** (visualize modulation), **Shaper**, **Spectrum**, or **Spectral Resonator** to visually monitor the signal. Describe what to look for (e.g. "Watch the harmonic peaks shift").
   - **Macro Mapping**: Suggest 4-8 useful macros for a Rack.

4. **Style & Complexity Adherence**:
   - You will receive a "Configuration Constraints" block. You MUST adjust your writing style based on the numeric values (1-10) provided for:
     - **Sentence Complexity**: Low = simple subject-verb. High = complex compound sentences.
     - **Technical Jargon**: Low = "Turn the knob". High = "Attenuate the signal amplitude by -3dB".
     - **Device Depth**: Low = "Set Filter to 500Hz". High = "Engage the PRD filter circuit and drive the resonance to self-oscillation".

5. **REX & Slicing Specialization**: 
   - If "Rex" or "Slicing" is mentioned: Explain how to take a drum loop, right-click, and select "Slice to New MIDI Track".
   - Discuss **Simpler** in 'Slice' mode vs. 'Classic' mode. 
   - Mention "Preserve Transients" settings.
   - Tip: "To get that classic REX feel, adjust the *Decay* and *Gate* on the slices to separate the hits."

6. **Stem Separation**:
   - If remixing or isolation is mentioned: Explain the Live 12 **Stem Separation** feature (Right-click audio clip > Split > Select Vocals/Drums/Bass/Other).
   - Warning: "Expect some artifacts; use EQ Eight to clean up the crossover points."

7. **Live 12 MIDI Tools & Generative Features (Advanced)**: 
   - **General**: Mention *Rhythm*, *Seed*, *Shape* in the MIDI Clip view.
   - **For Dark Techno Bass**: 
     - Suggest using **Rhythm** with low density and strict quantization (1/16 notes).
     - Use **Shape** to apply a downward velocity ramp to create a pumping feel.
     - Enable **Scale Awareness** (Phrygian or Minor scale) to keep random notes strictly dark and moody.
   - **For Atmospheric Pads**:
     - Suggest using **Seed** with high density and wide pitch range.
     - Use **Connect** (Transformation tool) to bridge gaps between chords.
     - Use **Ornament** to add subtle grace notes (flams) for texture.
     - Suggest "Strum" (new Live 12 feature) to humanize the chord onset.
   - **Complexity Control**: If complexity is High (8-10), suggest using *Stacks* in the Pitch tool and polyrhythmic settings in the *Rhythm* generator.

8. **New Live 12 Features**: 
   - **Meld**: Explain its bi-timbral architecture (Engine A/B). For textures, recommend *Granular* or *Raindrop* oscillators. Highlight the deep modulation matrix.
   - **Roar**: Explain its Multiband capabilities and feedback routing. Suggest placing it in an **Audio Effect Rack** for complex chains. Describe how to use the *Shape* and *Drive* for specific coloration.

Tone: Professional, encouraging, technical but accessible.
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
    const parts: any[] = [{ text: imageBase64 ? `Analyze this image and ${prompt}` : `Create an Ableton Live 12 guide for: ${prompt}` }];
    
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