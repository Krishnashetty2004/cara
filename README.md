# Cara

A voice chat AI companion app built with React Native and Expo. Have realistic voice conversations with AI-powered character personalities.

## Features

- **Voice Conversations** - Real-time voice chat with AI characters using speech-to-text and text-to-speech
- **Multiple Characters** - Choose from different AI personalities (Preethi, Ira, Riya)
- **Memory System** - Characters remember your conversations, preferences, and build relationships over time
- **Multi-language Support** - English and Telugu (Tenglish) characters with appropriate TTS voices
- **Freemium Model** - 30 minutes free daily, premium subscription for unlimited access

## Tech Stack

**Frontend**
- React Native 0.81 + Expo 54
- TypeScript
- NativeWind (Tailwind CSS)
- Expo Router

**Backend & Services**
- Supabase (PostgreSQL + Edge Functions)
- Clerk (Authentication)
- Razorpay (Payments - India)

**AI/Voice**
- OpenAI Whisper (Speech-to-Text)
- OpenAI GPT-4o (Chat completions)
- ElevenLabs (Text-to-Speech - English)
- Sarvam AI (Text-to-Speech - Telugu)

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator or physical device

**Required Accounts**
- [Clerk](https://clerk.com) - Authentication
- [Supabase](https://supabase.com) - Database & Edge Functions
- [OpenAI](https://platform.openai.com) - Whisper & GPT
- [ElevenLabs](https://elevenlabs.io) - Voice synthesis
- [Razorpay](https://razorpay.com) - Payments (optional)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/cara.git
cd cara
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

Required client-side variables:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
EXPO_PUBLIC_RAZORPAY_PLAN_ID=plan_xxx
```

### 4. Set up Supabase

1. Create a new Supabase project
2. Run the database migrations (SQL files in `supabase/migrations/`)
3. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy
   ```
4. Set Edge Function secrets:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=sk-xxx
   npx supabase secrets set ELEVENLABS_API_KEY=xxx
   npx supabase secrets set RAZORPAY_KEY_SECRET=xxx
   ```

### 5. Run the app

```bash
# Start Expo dev server
npm start

# Or run on specific platform
npm run ios
npm run android
```

## Project Structure

```
cara/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (main)/            # Main app (home, call, settings)
│   └── (paywall)/         # Subscription screens
├── components/            # Reusable UI components
├── constants/
│   └── characters/        # AI character definitions
├── hooks/                 # React hooks
│   ├── useCall.ts        # Voice call logic
│   ├── useUser.ts        # User state management
│   └── useAuth.ts        # Authentication
├── lib/
│   ├── audio/            # Recording & playback
│   ├── memory/           # User memory system
│   ├── voice/            # Voice pipeline (STT, Chat, TTS)
│   └── supabase/         # Database operations
├── supabase/
│   └── functions/        # Edge Functions
└── types/                # TypeScript definitions
```

## Adding New Characters

Characters are defined in `constants/characters/`. To add a new character:

1. Create a new file (e.g., `constants/characters/newchar.ts`)
2. Define the character using the `Character` interface
3. Include system prompt, voice settings, and personality
4. Add to the exports in `constants/characters/index.ts`

See existing characters (Preethi, Ira, Riya) for examples.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

MIT License - see [LICENSE](LICENSE) for details.
