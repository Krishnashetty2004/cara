# Voice AI Companion

An open source voice chat AI companion app built with React Native and Expo. Have realistic voice conversations with AI-powered character personalities.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Expo](https://img.shields.io/badge/Expo-54-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev)

## Features

- **Real-time Voice Conversations** - Talk naturally with AI characters using speech-to-text and text-to-speech
- **Multiple AI Personalities** - Choose from different character personalities with unique voices
- **Memory System** - Characters remember your conversations, preferences, and build relationships over time
- **Multi-language Support** - English and regional language characters with appropriate TTS voices
- **Freemium Model** - Free daily minutes with optional premium subscription

## Architecture

The app supports two modes of operation:

### Server-Side Mode (Recommended for Production)
- All AI processing happens on Supabase Edge Functions
- API keys stay secure on the server
- Uses Groq for ultra-fast inference (100x faster than OpenAI)
- Supports ElevenLabs + Sarvam AI for TTS

### Client-Side Mode (Development Only)
- Direct API calls from the app (keys embedded in bundle)
- **Not recommended for production** - API keys can be extracted
- Useful for quick local testing

## Tech Stack

**Frontend**
- React Native 0.81 + Expo 54
- TypeScript
- NativeWind (Tailwind CSS)
- Expo Router

**Backend**
- Supabase (PostgreSQL + Edge Functions + Auth)
- Clerk (User Authentication)

**AI/Voice**
- Groq (Ultra-fast Whisper STT + Llama 3.3 70B)
- OpenAI (Realtime API for voice sessions)
- ElevenLabs (Text-to-Speech - English)
- Sarvam AI (Text-to-Speech - Indian languages)

**Payments**
- Razorpay (India)
- *Stripe integration coming soon*

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator or physical device

### 1. Clone & Install

```bash
git clone https://github.com/user/voice-ai-companion.git
cd voice-ai-companion
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys. See [Environment Variables](#environment-variables) for details.

### 3. Set Up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Push database schema
npx supabase db push

# Deploy edge functions
npx supabase functions deploy

# Set secrets (see Environment Variables section)
npx supabase secrets set OPENAI_API_KEY=sk-xxx
npx supabase secrets set GROQ_API_KEY=gsk_xxx
# ... set all required secrets
```

### 4. Update App Identifiers

Edit `app.json` and change:
- `bundleIdentifier` (iOS)
- `package` (Android)
- `projectId` (your EAS project ID)

### 5. Run the App

```bash
# Start Expo dev server
npm start

# Or run on specific platform
npm run ios
npm run android
```

## Environment Variables

### Client-Side (Required)

| Variable | Description | Get From |
|----------|-------------|----------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth key | [Clerk Dashboard](https://clerk.com) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard > API |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key | [Razorpay Dashboard](https://razorpay.com) |
| `EXPO_PUBLIC_RAZORPAY_PLAN_ID` | Subscription plan ID | Razorpay > Subscriptions > Plans |

### Server-Side Secrets (Supabase Edge Functions)

Set these using `npx supabase secrets set KEY=VALUE`:

| Secret | Required | Description |
|--------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI Realtime API access |
| `GROQ_API_KEY` | Yes | Fast Whisper STT + Llama chat |
| `ELEVENLABS_API_KEY` | Yes* | TTS for English characters |
| `SARVAM_API_KEY` | No | TTS for Indian language characters |
| `RAZORPAY_KEY_ID` | Yes | Payment processing |
| `RAZORPAY_KEY_SECRET` | Yes | Payment authentication |
| `RAZORPAY_PLAN_ID` | Yes | Subscription plan reference |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Webhook signature verification |
| `CLERK_SECRET_KEY` | No | Optional server-side auth |

*Required if using ElevenLabs characters

## Project Structure

```
voice-ai-companion/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (main)/            # Main app (home, call, settings)
│   └── (paywall)/         # Subscription screens
├── components/            # Reusable UI components
├── constants/
│   └── characters/        # AI character definitions
├── hooks/                 # React hooks
│   ├── useCall.ts        # Client-side voice call
│   ├── useHybridCall.ts  # Server-side voice call
│   ├── useRealtimeCall.ts # OpenAI Realtime API
│   └── useUser.ts        # User state management
├── lib/
│   ├── audio/            # Recording & playback
│   ├── memory/           # User memory system
│   ├── voice/            # Voice pipeline (deprecated client-side)
│   └── supabase/         # Database operations
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database migrations
└── types/                # TypeScript definitions
```

## Adding New Characters

Characters are defined in `constants/characters/`. To add a new character:

1. Create a new file (e.g., `constants/characters/alex.ts`)
2. Define the character using the `Character` interface:

```typescript
import type { Character } from '@/types/character'

export const alex: Character = {
  id: 'alex',
  name: 'Alex',
  description: 'Your character description',
  avatar: require('@/assets/images/alex-avatar.png'),

  getSystemPrompt: (memory, relationship, lastSummary) => {
    // Return the character's system prompt
    return `You are Alex...`
  },

  getRandomOpener: () => {
    const openers = ['Hey!', 'What\'s up?']
    return openers[Math.floor(Math.random() * openers.length)]
  },

  voice: {
    provider: 'elevenlabs', // or 'sarvam'
    voiceId: 'your-voice-id',
    model: 'eleven_turbo_v2_5',
  }
}
```

3. Add to `constants/characters/index.ts`:

```typescript
export { alex } from './alex'
export const CHARACTERS = { preethi, ira, riya, alex }
```

4. Add voice ID to `supabase/functions/voice-turn/index.ts` if using server-side TTS

## Deployment

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

### Deploying Edge Functions

```bash
# Deploy all functions
npx supabase functions deploy

# Deploy specific function
npx supabase functions deploy voice-turn
```

## Customization

### Rebranding

1. Update `app.json`:
   - Change `name`, `slug`, `scheme`
   - Update `bundleIdentifier` and `package`
   - Replace icon and splash images

2. Update `package.json`:
   - Change `name` and `description`

3. Update legal text in `constants/legal.ts`

### Payment Provider

The app uses Razorpay (India-only). For global payments:

1. Set up Stripe account
2. Replace `lib/razorpay.ts` with Stripe implementation
3. Update edge functions for Stripe webhooks
4. Update `constants/config.ts` pricing

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Setting up development environment
- Code style and conventions
- Submitting pull requests
- Adding new characters

## Security

See [SECURITY.md](SECURITY.md) for:
- Security policy
- Reporting vulnerabilities
- API key handling best practices

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Expo](https://expo.dev) - React Native framework
- [Supabase](https://supabase.com) - Backend infrastructure
- [Clerk](https://clerk.com) - Authentication
- [Groq](https://groq.com) - Ultra-fast inference
- [ElevenLabs](https://elevenlabs.io) - Voice synthesis
