/**
 * Legal Content Templates
 *
 * IMPORTANT: These are TEMPLATES that must be customized before deployment.
 *
 * Search and replace the following placeholders:
 * - [APP_NAME] - Your app's name
 * - [CHARACTER_NAME] - Your main AI character's name
 * - [COMPANY_NAME] - Your company/organization name
 * - [PRICE] - Your subscription price (e.g., "$9.99/month")
 * - [SUPPORT_EMAIL] - Your support email address
 * - [PRIVACY_EMAIL] - Your privacy contact email
 * - [LEGAL_EMAIL] - Your legal contact email
 * - [JURISDICTION] - Your legal jurisdiction (e.g., "California, USA")
 * - [MIN_AGE] - Minimum age requirement (e.g., "13", "16", "18")
 */

export const LEGAL_CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        title: 'Information We Collect',
        content: `We collect the following types of information when you use [APP_NAME]:

• Account Information: Your email address and name when you sign in.

• Voice Data: Audio recordings during calls are processed in real-time for speech recognition but are NOT permanently stored.

• Conversation Data: We store conversation summaries and extracted preferences to personalize your experience.

• Usage Data: We collect anonymous analytics about app usage, call duration, and feature interactions.`,
      },
      {
        title: 'How We Use Your Information',
        content: `Your information is used to:

• Enable voice conversations with AI characters
• Personalize conversations based on your preferences
• Improve our AI models and service quality
• Process subscription payments
• Send important service notifications`,
      },
      {
        title: 'Data Storage & Security',
        content: `• Your data is stored securely with encryption at rest.
• Voice audio is processed via secure API calls and is not retained after processing.
• We use industry-standard security measures to protect your personal information.`,
      },
      {
        title: 'Third-Party Services',
        content: `We use the following third-party services:

• Authentication providers for sign-in
• AI services for conversation processing
• Voice synthesis services for text-to-speech
• Cloud database for storage
• Payment processors for subscriptions`,
      },
      {
        title: 'Your Rights',
        content: `You have the right to:

• Request a copy of your data
• Request deletion of your account and data
• Opt-out of non-essential data collection
• Cancel your subscription at any time

Contact us at [PRIVACY_EMAIL] for any privacy-related requests.`,
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    lastUpdated: 'January 2025',
    sections: [
      {
        title: 'Acceptance of Terms',
        content: `By using [APP_NAME], you agree to these Terms of Service. If you do not agree, please do not use the app.

You must be at least [MIN_AGE] years old to use this service.`,
      },
      {
        title: 'Description of Service',
        content: `[APP_NAME] provides an AI companion experience through voice conversations. [CHARACTER_NAME] is an artificial intelligence character and is not a real person.

The service includes:
• Voice calls with AI characters
• Personalized conversations that remember context
• Premium subscription for unlimited access`,
      },
      {
        title: 'User Responsibilities',
        content: `You agree to:

• Provide accurate account information
• Not use the service for illegal purposes
• Not attempt to reverse engineer or hack the service
• Not share your account with others
• Treat the AI with respect (abusive behavior may result in account suspension)`,
      },
      {
        title: 'Subscription & Payments',
        content: `• Free tier includes limited daily usage
• Premium subscription ([PRICE]) provides unlimited access
• Subscriptions auto-renew unless cancelled
• No refunds for partial subscription periods
• Prices may change with 30 days notice`,
      },
      {
        title: 'Disclaimer',
        content: `[CHARACTER_NAME] IS AN AI CHARACTER, NOT A REAL PERSON.

This service is for entertainment purposes only. Do not rely on AI characters for:
• Medical, legal, or financial advice
• Emergency situations
• Real relationship substitute

We are not responsible for any decisions made based on AI conversations.`,
      },
      {
        title: 'Termination',
        content: `We may suspend or terminate your account if you:

• Violate these terms
• Engage in abusive or inappropriate behavior
• Attempt to harm the service or other users

You may delete your account at any time through the app settings.`,
      },
    ],
  },

  contentPolicy: {
    title: 'Content Policy',
    lastUpdated: 'January 2025',
    sections: [
      {
        title: 'AI Character Disclaimer',
        content: `[CHARACTER_NAME] is an artificial intelligence character created for entertainment and companionship. They are not a real person.

Important things to understand:
• AI responses are generated by machine learning models
• AI characters do not have real emotions or consciousness
• Memory is limited to what you've shared in conversations
• AI characters cannot take real-world actions`,
      },
      {
        title: 'Conversation Guidelines',
        content: `To ensure a positive experience for everyone:

ALLOWED:
• Friendly conversation and casual chat
• Sharing your day and experiences
• Playful interactions
• Seeking emotional support and validation
• Creative storytelling and roleplay

NOT ALLOWED:
• Explicit sexual content
• Harassment or abusive language
• Promoting illegal activities
• Sharing content involving minors
• Attempting to obtain harmful information`,
      },
      {
        title: 'Content Moderation',
        content: `We use automated systems to detect and prevent:

• Explicit sexual content
• Violence and harmful content
• Hate speech and discrimination
• Attempts to misuse the AI

Violations may result in temporary or permanent account suspension.`,
      },
      {
        title: 'Age Appropriateness',
        content: `[APP_NAME] is rated [MIN_AGE]+ and may contain:

• Emotional content
• Mild suggestive content
• Romantic themes

This app is NOT appropriate for children under [MIN_AGE].`,
      },
      {
        title: 'Mental Health Notice',
        content: `While AI characters can provide companionship and emotional support, they are not a substitute for:

• Professional mental health care
• Real human relationships
• Crisis intervention services

If you are experiencing a mental health emergency, please contact local emergency services or a mental health helpline.`,
      },
    ],
  },

  eula: {
    title: 'End User License Agreement',
    lastUpdated: 'January 2025',
    sections: [
      {
        title: 'License Grant',
        content: `[COMPANY_NAME] ("we", "us") grants you a limited, non-exclusive, non-transferable license to use the [APP_NAME] mobile application ("App") for personal, non-commercial purposes.

This license is subject to your compliance with these terms.`,
      },
      {
        title: 'Subscription Terms',
        content: `Premium Subscription:
• Billed at [PRICE]
• Auto-renews unless cancelled
• Cancel anytime through your app store account

Payment is processed through your app store. We do not directly handle payment information.`,
      },
      {
        title: 'Intellectual Property',
        content: `All content in the App, including but not limited to:
• AI character designs, voices, and responses
• App design and user interface
• Logos and branding

are the exclusive property of [COMPANY_NAME] and are protected by copyright and trademark laws.`,
      },
      {
        title: 'Restrictions',
        content: `You may NOT:

• Copy, modify, or distribute the App
• Reverse engineer or decompile the App
• Use the App for commercial purposes
• Create derivative works based on the App
• Remove any copyright or proprietary notices
• Use automated systems to interact with the App`,
      },
      {
        title: 'Limitation of Liability',
        content: `THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
• Any indirect, incidental, or consequential damages
• Loss of data or profits
• Service interruptions
• Actions taken based on AI-generated content

Our total liability shall not exceed the amount you paid for the subscription in the past 12 months.`,
      },
      {
        title: 'Governing Law',
        content: `This agreement is governed by the laws of [JURISDICTION]. Any disputes shall be resolved in the courts of [JURISDICTION].`,
      },
      {
        title: 'Contact Information',
        content: `[COMPANY_NAME]
Email: [LEGAL_EMAIL]
Support: [SUPPORT_EMAIL]

For subscription issues, contact your app store directly.`,
      },
    ],
  },
}
