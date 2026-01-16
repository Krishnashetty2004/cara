# Contributing to Voice AI Companion

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Adding Characters](#adding-characters)

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all backgrounds and experience levels.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/voice-ai-companion.git
   cd voice-ai-companion
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/voice-ai-companion.git
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm start
```

### Running Tests

```bash
# Type check
npx tsc --noEmit

# Lint (if configured)
npm run lint
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-character`
- `fix/audio-playback-issue`
- `docs/update-readme`

### Commit Messages

Write clear, concise commit messages:

```
feat: add Spanish language character

- Create new character definition
- Add TTS voice configuration
- Update character index
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

## Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make your changes** and commit

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

5. **Open a Pull Request** on GitHub

6. **Describe your changes**:
   - What does this PR do?
   - How was it tested?
   - Any breaking changes?

7. **Address review feedback**

## Code Style

### TypeScript

- Use TypeScript for all new files
- Define types for function parameters and return values
- Avoid `any` type when possible

```typescript
// Good
function processAudio(uri: string): Promise<string> {
  // ...
}

// Avoid
function processAudio(uri: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Use meaningful prop names

```typescript
// Good
interface CharacterCardProps {
  character: Character
  onSelect: (id: string) => void
  isSelected: boolean
}

export function CharacterCard({ character, onSelect, isSelected }: CharacterCardProps) {
  // ...
}
```

### File Organization

- One component per file
- Group related files in folders
- Use index.ts for folder exports

### Naming Conventions

- **Files**: `kebab-case.ts` or `PascalCase.tsx` for components
- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

## Adding Characters

### Character File Structure

Create `constants/characters/your-character.ts`:

```typescript
import type { Character } from '@/types/character'

export const yourCharacter: Character = {
  id: 'your-character',
  name: 'Character Name',
  tagline: 'Short description',
  description: 'Longer description for selection screen',
  avatar: require('@/assets/images/your-character-avatar.png'),

  getSystemPrompt: (memory, relationship, lastSummary) => {
    const userName = memory?.name || null

    return `Your detailed system prompt here...

    ${userName ? `User's name is ${userName}.` : ''}
    ${lastSummary ? `Previous conversation: ${lastSummary}` : ''}
    `
  },

  getRandomOpener: () => {
    const openers = [
      'Opening line 1',
      'Opening line 2',
      'Opening line 3',
    ]
    return openers[Math.floor(Math.random() * openers.length)]
  },

  voice: {
    provider: 'elevenlabs', // or 'sarvam'
    voiceId: 'your-voice-id-from-elevenlabs',
    model: 'eleven_turbo_v2_5',
  }
}
```

### Voice Provider Options

**ElevenLabs** (English, most languages):
```typescript
voice: {
  provider: 'elevenlabs',
  voiceId: 'voice-id-from-elevenlabs',
  model: 'eleven_turbo_v2_5',
}
```

**Sarvam AI** (Indian languages):
```typescript
voice: {
  provider: 'sarvam',
  voiceId: 'speaker-name',
  language: 'te-IN', // or 'hi-IN', 'ta-IN', etc.
}
```

### Registering the Character

Add to `constants/characters/index.ts`:

```typescript
import { yourCharacter } from './your-character'

export const CHARACTERS: Record<CharacterId, Character> = {
  // ... existing characters
  'your-character': yourCharacter,
}
```

### Adding Server-Side Voice Support

Update `supabase/functions/voice-turn/index.ts` to include the voice ID in the `getVoiceId()` function.

## Questions?

Open an issue or discussion on GitHub if you have questions about contributing.

Thank you for contributing!
