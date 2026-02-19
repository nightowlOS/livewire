# LiveWire: Application Design Document

## 1. Overview
LiveWire is a specialized React-based frontend application designed to act as an intelligent companion for Ableton Live 12 users. It leverages the Google Gemini API to provide context-aware sound design tutorials, workflow suggestions, and technical documentation.

The application's core design philosophy is **"Native Integration"**. It mimics the visual language, typography, and layout of Ableton Live itself to minimize context switching for the user.

## 2. Architecture

### Frontend-First Architecture
*   **Framework**: React 19 (via ESM imports).
*   **Language**: TypeScript.
*   **Build System**: Browser-native ES modules (no complex bundler required for this specific implementation, uses `importmap`).
*   **Styling**: Tailwind CSS configured with a custom design token system mapped to CSS variables.

### External Services
*   **AI Backend**: Google Gemini API (`@google/genai` SDK).
    *   **Model Tiering**:
        *   `gemini-3-flash-preview`: Used for standard text generation, chat, and audio transcription.
        *   `gemini-3-pro-preview`: Used for complex image analysis and multi-modal contexts.
        *   `gemini-2.5-flash-image`: Used for image editing tasks.

### Persistence Layer
*   **LocalStorage**: The app functions without a traditional database. User data is persisted in the browser's `localStorage`:
    *   `ableton-theme`: Current UI theme.
    *   `ableton-custom-themes`: User-created color palettes.
    *   `ableton-shortcuts`: Custom keyboard bindings.
    *   `ableton-templates`: Saved prompt/response pairs.

## 3. UI/UX Design System

### Theming Engine
The application implements a robust theming engine based on CSS variables defined in `index.html` and toggled via `App.tsx`.

**Theme Presets:**
1.  **Live 12 Dark** (Default): High contrast dark gray (`#1a1a1a`) with orange accents.
2.  **Live 12 Light**: Light gray (`#f3f3f3`) mimicking Live's light look.
3.  **Live 9 Legacy**: Classic blue accents and medium grays.
4.  **Vaporwave/Matrix/Rust/Ocean**: Stylized themes for creative inspiration.
5.  **Custom**: Users can define hex codes for Base, Surface, Panel, Border, Text, Muted, and Accent colors.

### Layout Strategy
The layout mirrors the "Session View" vs "Browser" dichotomy of Ableton Live:
*   **Sidebar (Left)**: Acts as the "Browser". Contains Tabs for History, Templates, Tools, and Settings.
*   **Main Content (Center)**: Acts as the "Device/Clip View". Displays the chat history, generated guides, and visualization.
*   **Input Footer (Bottom)**: Acts as the "Info View/Transport". Contains the prompt input, modifier buttons, and media upload controls.

### Visual Components
*   **Typography**: Uses `Inter` (sans-serif) for UI elements and `Menlo/Monaco` (monospace) for technical values, mimicking Live's font stack.
*   **Output Display**: A custom markdown renderer that:
    *   Parses `###` into Ableton-style headers.
    *   Colors specific keywords (e.g., device names) based on the active theme.
    *   **Reactive Visuals**: If the AI discusses "Freezing" or "Reverb Drones", the container creates a CSS pulsing animation (`freeze-active`) to provide ambient visual feedback.

## 4. User Flow

1.  **Input**:
    *   **Text**: Typed prompts.
    *   **Audio**: Microphone recording (transcribed via Gemini).
    *   **Image**: Drag-and-drop screenshots of VSTs or Live sets.
2.  **Configuration**:
    *   User selects context (Genre, Expertise Level, Live Version) via the Settings tab.
    *   Or uses specific "Tools" (MIDI Generator, Arrangement Architect) to construct a structured prompt programmatically.
3.  **Processing**:
    *   The app constructs a "System Instruction" block injecting the user's preferences.
    *   Streams the request to Gemini.
4.  **Output**:
    *   Streamed text is rendered in real-time.
    *   **Export**: Users can export the generated guide in multiple formats simultaneously (**PDF, DOCX, HTML, Markdown, JSON, XML**) with consistent styling applied.
    *   **Templates**: Save useful workflows for later recall.

## 5. File Structure Concept
```
/
├── index.html          # Entry point, CSS Variables, Tailwind Config
├── index.tsx           # React Mount
├── App.tsx             # Main Application Logic & State Container
├── types.ts            # TypeScript Interfaces
├── metadata.json       # App Metadata & Permissions
├── services/
│   └── geminiService.ts # API interactions
└── components/
    ├── Button.tsx      # Reusable UI button
    ├── Switch.tsx      # Toggle switch
    └── OutputDisplay.tsx # Markdown renderer & visualizer
```