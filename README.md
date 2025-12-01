# Matcha - AI-Assisted Job Matching Platform

Matcha is an AI-assisted job matching assistant for students and early-career professionals. It allows users to create profiles without traditional resumes and discover job matches tailored to their skills and preferences.

## Features

- **Multi-Step Profile Creation**: Guided form with 5 steps to capture user information
- **Speech-to-Text Integration**: Voice input using Hugging Face Whisper AI for skills and achievements
- **AI-Powered Skills Extraction**: OpenAI API extracts and normalizes skills from transcripts with automatic fallback
- **Privacy-First Design**: Audio is processed and immediately discarded; PII is separated from matching data
- **Responsive UI**: Modern, accessible interface built with Next.js, TypeScript, and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Services**: 
  - Hugging Face Inference API (Whisper model for speech-to-text)
  - OpenAI API (for structured skills extraction)
- **State Management**: React Hooks with localStorage persistence

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Hugging Face account with API key ([Get one here](https://huggingface.co/settings/tokens))
- OpenAI account with API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Matcha
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```
HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Important**: These API keys should be server-side only (without `NEXT_PUBLIC_` prefix) for security.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
Matcha/
├── app/
│   ├── api/
│   │   └── transcribe/        # Hugging Face Whisper API route
│   ├── profile/               # Profile creation page
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles
├── components/
│   └── profile/
│       ├── ProfileForm.tsx    # Main form container
│       ├── StepIndicator.tsx  # Progress indicator
│       ├── Step1-5.tsx        # Individual step components
│       └── SpeechInput.tsx    # Speech-to-text component
├── lib/
│   ├── hooks/
│   │   └── useProfileForm.ts  # Form state management
│   └── services/
│       └── speechToText.ts   # Speech transcription utilities
├── types/
│   └── profile.ts             # TypeScript type definitions
└── DESIGN_ARTIFACTS.md        # UML diagrams and design patterns
```

## Usage

1. Navigate to the home page and click "Get Started"
2. Complete the 5-step profile form:
   - **Step 1**: Basic information (name, email, phone)
   - **Step 2**: Skills (voice input with review/edit)
   - **Step 3**: Experience Summary (years, seniority, achievements)
   - **Step 4**: Job Preferences (roles, company size, industries, remote preference)
   - **Step 5**: Review & Consent (privacy notice and submission)
3. Use the microphone button to record voice input for skills and achievements
4. Review your information and submit

## Speech-to-Text Feature

- **Model**: Hugging Face `openai/whisper-small`
- **Language**: English only
- **Privacy**: Audio is processed and immediately discarded; only transcripts are stored
- **Fallback**: Automatic fallback to text input if transcription fails

## Skills Extraction Feature

- **Service**: OpenAI API (gpt-4o-mini)
- **Function**: Extracts and normalizes professional skills from transcripts
- **Privacy**: Only transcript text is sent to OpenAI (no PII); processed data is immediately discarded
- **Fallback**: Automatic fallback to simple parsing if OpenAI API fails or times out

## Privacy & Security

- Personal identifiers (name, email, phone) are stored separately from anonymized profile features
- Raw audio files are never persisted
- Third-party AI usage is clearly disclosed to users
- Privacy notices are displayed at relevant points in the flow

## Development Notes

- Form data is persisted to localStorage for draft recovery
- All form validation is client-side
- API integration for profile storage will be implemented in Task 2
- Database schema will be set up with Vercel Neon PostgreSQL in Task 2

## Next Steps (Task 2)

- Set up Vercel Neon PostgreSQL database
- Implement backend API for profile storage
- Create Profile Service with PII separation
- Add authentication (optional)

## License

This project is part of a course assignment.

