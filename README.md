# LEARN-X

AI-powered personalized learning platform that transforms educational content based on your unique learning style, interests, and professional background.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/learn-x.git
cd learn-x
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

4. Configure your environment variables (see Environment Variables section)

5. Run the development servers:
```bash
# From root directory
npm run dev
```

## 🏗️ Project Structure

```
learn-x/
├── frontend/          # Next.js frontend application
├── backend/           # Node.js/Express API server
├── supabase/         # Supabase migrations and config
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## 🔧 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL with pgvector)
- **AI**: OpenAI GPT-4
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel (frontend), Railway (backend)

## 📝 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```
PORT=3001
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
```

## 🧪 Testing

```bash
# Run frontend tests
cd frontend && npm test

# Run backend tests
cd backend && npm test

# Run all tests
npm test
```

## 📖 Documentation

- [Product Requirements](./PRD.md)
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [API Documentation](./API_DESIGN.md)
- [UI/UX Mockups](./UI_UX_MOCKUPS.md)
- [AI Personalization Guide](./CLAUDE.md)
- [Coding Standards](./CODING_STANDARDS.md) - **MUST READ for all developers**
- [Project Plan](./PROJECT_PLAN.md)

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License.