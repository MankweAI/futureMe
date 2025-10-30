 # WhatsApp AI Tutor Chatbot (Vercel Deployment)

A CAPS curriculum aligned WhatsApp AI Tutor chatbot powered by interconnected AI agents, optimized for Vercel deployment.

## Project Structure (Vercel Optimized)

```
whatsapp-ai-tutor-vercel/
├── api/                     # Vercel API endpoints (max 12 for free)
│   ├── index.js            # Main health check endpoint
│   ├── webhook.js          # WhatsApp webhook handler
│   ├── agent-manager.js    # AI Agent Manager endpoint
│   ├── homework.js         # Homework Agent endpoint
│   ├── practice.js         # Practice Questions endpoint
│   └── upload.js           # File upload handler
├── lib/                     # Shared library code
│   ├── agents/             # AI Agent implementations
│   │   ├── agent-manager.js
│   │   ├── homework-agent.js
│   │   └── practice-agent.js
│   ├── config/             # Configuration files
│   │   ├── database.js     # Supabase configuration
│   │   ├── openai.js       # OpenAI configuration
│   │   └── manychat.js     # ManyChat configuration
│   ├── utils/              # Utility functions
│   │   ├── logger.js       # Logging utility
│   │   ├── ocr.js         # Image processing
│   │   └── helpers.js      # General helpers
│   └── middleware/         # Middleware functions
│       ├── auth.js        # Authentication
│       └── validation.js   # Input validation
├── tests/                  # Test files
├── docs/                   # Documentation
├── scripts/                # Setup scripts
├── .env.local             # Local environment variables
├── .gitignore             # Git ignore file
├── package.json           # Dependencies
├── vercel.json            # Vercel configuration
└── README.md              # This file
```

## Vercel API Endpoints (8 total - under 12 limit)

1. `/api/index` - Health check
2. `/api/webhook` - WhatsApp webhook
3. `/api/agent-manager` - Main AI orchestrator
4. `/api/homework` - Homework assistance
5. `/api/practice` - Practice questions
6. `/api/upload` - File uploads (images/voice)
7. `/api/test-connections` - Test all integrations
8. `/api/user-profile` - User management

## Setup Instructions

1. Clone this project structure
2. Run `npm install` to install dependencies
3. Copy `.env.local.example` to `.env.local` and fill in your API keys
4. Run `npm run setup` to initialize
5. Run `npm run dev` to start local development with Vercel CLI
6. Run `npm run deploy` to deploy to Vercel

## Tech Stack

- **Hosting**: Vercel (Serverless Functions)
- **Backend**: Node.js (Serverless)
- **AI**: OpenAI GPT-4 API
- **Database**: Supabase (PostgreSQL)
- **WhatsApp**: ManyChat Integration
- **Image Processing**: Tesseract.js (OCR)

## Development Phases

- [x] Phase 0: Vercel Project Structure Setup
- [ ] Phase 1: Environment Configuration & API Keys
- [ ] Phase 2: WhatsApp Integration via ManyChat
- [ ] Phase 3: AI Agent Manager Implementation
- [ ] Phase 4: Homework Agent Development
- [ ] Phase 5: Practice Questions Agent
- [ ] Phase 6: Integration & Testing
- [ ] Phase 7: Vercel Deployment & Production

## Author

Created by tasimaditheto - EdTech Founder
Date: 2025-09-02
