# Minimalist AI Chart Application

A modern, AI-powered chart and document analysis application built with React, Vite, and Tailwind CSS. This application allows users to upload documents (PDF, DOCX, XLSX, etc.) and interact with them through an AI-powered interface that can extract information, generate insights, and create visualizations.

## Features

- **Document Upload & Processing**: Support for PDF, DOCX, XLSX, and other formats
- **AI-Powered Analysis**: Extract text, tables, and insights from documents
- **Interactive Chat Interface**: Ask questions about your documents in natural language
- **Code & Chart Generation**: Generate visualizations and code snippets from document content
- **Real-time Preview**: View documents and generated content side-by-side
- **Modular Architecture**: Clean separation of concerns with React components

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Document Processing**:
  - PDF.js for PDF rendering and text extraction
  - Mammoth for DOCX conversion
  - SheetJS (xlsx) for spreadsheet processing
  - JSZip for archive handling
  - KaTeX for mathematical formula rendering
- **Utilities**: clsx, tailwind-merge for conditional class joining
- **TypeScript**: Full type safety

## Project Structure

```
src/
├── App.tsx                 # Main application component
├── main.tsx                # Entry point
├── index.css               # Global styles
├── lib/                    # Core logic and utilities
│   ├── agent.ts            # AI agent integration
│   ├── ingest.ts           # Document ingestion pipeline
│   ├── mcp.ts              # Model Context Protocol implementation
│   ├── skills.ts           # AI skills and capabilities
│   ├── store.ts            # Zustand state management
│   ├── tools.ts            # Utility functions
│   ├── types.ts            # TypeScript interfaces
│   ├── web.ts              # Web-specific utilities
│   └── xml.ts              # XML processing utilities
├── canvas/                 # Document viewing and interaction components
│   ├── CanvasHost.tsx      # Main canvas container
│   ├── FileEditor.tsx      # Document editor/viewer
│   ├── ProjectView.tsx     # Project overview
│   ├── Blocks.tsx          # Content blocks
│   ├── WebViewer.tsx       # Web content viewer
│   └── view.ts             # Canvas view utilities
├── ui/                     # User interface components
│   ├── Chrome.tsx          # Application shell/layout
│   ├── Composer.tsx        # Chat input component
│   ├── Message.tsx         # Chat message display
│   ├── Modals.tsx          # Modal dialogs
│   └── Icons.tsx           # Icon components
├── md/                     # Markdown processing components
│   ├── Markdown.tsx        # Markdown renderer
│   ├── highlight.tsx       # Syntax highlighting
│   └── parse.ts            # Markdown parser
├── utils/                  # Utility functions
│   └── cn.ts               # Class name utility
└── styles/                 # CSS stylesheets
    ├── app.css             # Application styles
    ├── canvas.css          # Canvas-specific styles
    ├── globals.css         # Global CSS variables
    └── prose.css           # Typography styles
```

## Setup and Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bhavyam2468/minimalist-ai-chart.git
   cd minimalist-ai-chart
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

## Available Scripts

- `npm run dev` - Start development server with Vite
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally

## Environment Variables

The application runs entirely client-side and needs just one variable, which is read at **build time**:

| Variable          | Required | Description                                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `VITE_OPENAI_KEY` | No       | OpenAI API key used to pre-fill Settings → API Key. If unset, leave it empty and paste a key in the app's Settings modal instead. |

### Local development

1. Copy the example file and fill in your key:
   ```bash
   cp .env.example .env.local
   ```
   ```dotenv
   VITE_OPENAI_KEY=sk-...
   ```
2. Restart the dev server (`npm run dev`).

`.env.local` is git-ignored (Vite's `*.local` convention), so your key never gets committed.

### Deploying to Vercel

Because Vite variables are baked in at build time, configure them in Vercel so builds pick them up:

1. In the [Vercel dashboard](https://vercel.com/dashboard), open your project → **Settings → Environment Variables**.
2. Add:
   - **Key**: `VITE_OPENAI_KEY`
   - **Value**: your OpenAI API key (`sk-...`)
   - **Environments**: Production, Preview, and/or Development as needed
3. **Redeploy** — environment variable changes only apply to new builds.

> ⚠️ **Security note**: any variable prefixed with `VITE_` is embedded in the client bundle and visible to everyone who loads the site. For public deployments, prefer a key with strict usage limits, or route AI calls through a serverless proxy rather than shipping the key to browsers.

## AI Capabilities

The application integrates AI capabilities through:

1. **Document Understanding**: Extract structured information from uploaded documents
2. **Natural Language Querying**: Ask questions about document content
3. **Content Generation**: Create summaries, insights, and visualizations
4. **Code Assistance**: Generate code snippets based on document examples

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Bundled with [Vite](https://vitejs.dev/)
- Document processing powered by [PDF.js](https://mozilla.github.io/pdf.js/) and [Mammoth](https://github.com/mwilliamson/mammoth.js)