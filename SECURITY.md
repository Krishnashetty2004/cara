# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to the maintainers directly
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond promptly to valid reports.

## Security Considerations

### API Key Management

This project uses multiple API keys. Here's how to handle them securely:

#### Client-Side Keys (Embedded in App Bundle)

These keys are **visible to anyone** who decompiles the app:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Safe to expose (designed for client use)
- `EXPO_PUBLIC_SUPABASE_URL` - Safe to expose
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Safe with proper RLS policies
- `EXPO_PUBLIC_RAZORPAY_KEY_ID` - Safe to expose (public key)

#### Server-Side Keys (Must Stay Secret)

**NEVER** put these in client code:

- `OPENAI_API_KEY` - Can incur unlimited charges
- `GROQ_API_KEY` - Can incur charges
- `ELEVENLABS_API_KEY` - Can incur charges
- `RAZORPAY_KEY_SECRET` - Can authorize payments
- `RAZORPAY_WEBHOOK_SECRET` - Can forge webhooks
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses all security

#### Development vs Production

The codebase includes client-side API call implementations in `lib/voice/` for development convenience. These files are marked as **deprecated**:

- `lib/voice/chat.ts` - Uses `EXPO_PUBLIC_OPENAI_API_KEY`
- `lib/voice/whisper.ts` - Uses `EXPO_PUBLIC_OPENAI_API_KEY`
- `lib/voice/elevenlabs.ts` - Uses `EXPO_PUBLIC_ELEVENLABS_API_KEY`

**For production**, use the server-side implementation via Supabase Edge Functions (`useHybridCall` hook) which keeps API keys secure.

### Database Security

#### Row Level Security (RLS)

All Supabase tables use RLS policies. Key principles:

- Users can only access their own data
- Service role key bypasses RLS (backend only)
- Anonymous key respects RLS policies

#### Authentication Flow

1. User authenticates via Clerk
2. Clerk JWT is passed to Supabase Edge Functions
3. Edge Functions verify JWT and extract user ID
4. Database queries are scoped to authenticated user

### Payment Security

- Razorpay handles all payment card data
- App never sees or stores card numbers
- Webhook signatures verify payment events
- Server-side verification before granting access

### Data Privacy

#### What We Store

- User profile (email, name from Clerk)
- Conversation history (for memory features)
- Extracted facts and preferences
- Subscription status

#### What We Don't Store

- Audio recordings (processed and discarded)
- Payment card details (handled by Razorpay)
- Raw API responses

### Recommended Security Practices

1. **Rotate API keys** periodically
2. **Monitor API usage** for anomalies
3. **Use test keys** during development
4. **Enable RLS** on all new tables
5. **Validate webhook signatures** always
6. **Sanitize user input** before storing

### Known Limitations

1. **Client-side voice files**: The deprecated `lib/voice/` files use client-embedded keys. Don't use these in production.

2. **Memory feature**: Conversation data is stored for personalization. Implement data deletion if required by regulations.

3. **Third-party services**: We depend on Clerk, Supabase, OpenAI, Groq, and ElevenLabs. Review their security practices.

## Security Checklist for Deployment

- [ ] All server-side secrets are in Supabase secrets, not in code
- [ ] No real API keys in `.env.example` or committed files
- [ ] RLS policies are enabled on all tables
- [ ] Webhook endpoints verify signatures
- [ ] Client-side deprecated files are not used in production
- [ ] Service role key is only used in Edge Functions
- [ ] CORS is properly configured for production domains

## Contact

For security concerns, contact the maintainers through GitHub's private vulnerability reporting feature or via email.
