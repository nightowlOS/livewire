# LiveWire: Functionality & Code Documentation

## 1. Core Modules

### `App.tsx`
The central controller of the application. It handles:
*   **Global State**: Stores history, preferences, active theme, and templates.
*   **Routing**: Manages the tab switching logic (`history`, `templates`, `tools`, `settings`).
*   **Event Handling**: Keyboard shortcuts, file inputs, and audio recording toggles.
*   **Modal Management**: Controls visibility for Export, Save Template, and Help dialogs.

### `services/geminiService.ts`
The communication layer with the Google Gemini API.
*   **`generateAbletonGuideStream`**:
    *   **Input**: Text prompt, optional Base64 image.
    *   **Logic**: Selects the appropriate model (`gemini-3-flash` vs `gemini-3-pro`) based on input complexity. Injects the `SYSTEM_INSTRUCTION` which defines the persona (Ableton Certified Trainer).
    *   **Output**: Streams text chunks to a callback function.
*   **`transcribeAudio`**:
    *   **Input**: Base64 audio string (WAV).
    *   **Logic**: Uses multi-modal capabilities to convert audio to text instructions.
*   **`editImage`**:
    *   **Input**: Base64 image + text instruction.
    *   **Logic**: Uses `gemini-2.5-flash-image` to perform pixel-level editing based on natural language.

## 2. Key Functions & Logic Flow

### A. Generation Logic
*   **`handleGenerate(text?, modifier?)`**:
    *   **Trigger**: User clicks "Generate" or presses Enter.
    *   **Process**:
        1.  Captures current prompt and optional image.
        2.  Reads `UserPreferences` (tone, os, version).
        3.  Constructs a "Context Prompt" combining the user input with a hidden configuration block (e.g., `[Configuration Constraints]: Expertise Level: Expert...`).
        4.  Calls `geminiService.generateAbletonGuideStream`.
        5.  Updates `history` state with the User and Model messages.

### B. Tool Generators (Prompt Engineering)
Located within the `tools` tab in `App.tsx`, these functions construct complex prompts programmatically:
*   **MIDI Generator**: Combines sliders (Complexity, Musicality, Humanization) to create a prompt asking for specific Live 12 MIDI Transformation settings.
*   **Arrangement Architect**: Uses checkboxes (Variations) and Dropdowns (Genre) to request a bar-by-bar track structure.
*   **Effect Rack**: Requests a chain of audio effects based on a selected target (Distortion, Space, etc.).

### C. Suggestions Engine
*   **`getSmartSuggestions(currentPrompt)`**:
    *   **Logic**: Analyzes keywords in the user's last prompt (e.g., "bass", "pad", "drum").
    *   **Output**: Returns an array of strings.
        *   *Contextual*: "Add Sidechain" if "bass" is detected.
        *   *Refinement*: "Simplify for beginner", "Make it experimental".

### D. Export System
*   **`performExport()`**:
    *   **Input**: Current generated response, selected format (`md`, `html`, `pdf`), filename, and theme ID.
    *   **Logic**:
        *   **HTML/PDF**: Wraps the markdown content in a localized HTML template injecting the selected theme's colors into the CSS `<style>` block.
        *   **PDF**: Opens a print window with the styled HTML.
        *   **Download**: Creates a generic `Blob` and triggers a link click.

### E. Theme System
*   **`applyCustomTheme(customTheme)`**:
    *   **Logic**: Manipulates the DOM directly (`document.documentElement.style.setProperty`) to override CSS variables (`--color-base`, `--color-accent`, etc.) in real-time without reloading.

## 3. Interconnectivity

1.  **User Input** -> **App Component State**: `prompt`, `preferences`, `selectedImage`.
2.  **App Component** -> **Gemini Service**: Passes prepared data strings.
3.  **Gemini Service** -> **App Component**: Streams chunks back via callback `setResponse(prev => prev + chunk)`.
4.  **App Component** -> **OutputDisplay Component**: Passes the raw markdown string.
5.  **OutputDisplay Component**: Renders HTML, triggering specific CSS animations (e.g., `.freeze-active`) based on keyword matching within the content.

## 4. Data Models (`types.ts`)

*   **`UserPreferences`**: Stores the "personality" settings of the AI (e.g., `creativity: 'experimental'`, `useEmojis: true`).
*   **`SavedTemplate`**: Structure for saving prompts/responses to localStorage.
*   **`CustomTheme`**: Definition for user-created color palettes.
*   **`ShortcutMap`**: Maps actions (e.g., `generate`, `undo`) to keyboard keys.

## 5. External Dependencies
*   **`@google/genai`**: The sole dependency for AI logic.
*   **`tailwindcss`**: Loaded via CDN for styling utility classes.
*   **`react`, `react-dom`**: Core framework.
