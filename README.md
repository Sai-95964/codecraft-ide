# CodeCraft IDE

A modern, cloud-based development environment with AI-powered code assistance, file management, and instant code execution for multiple languages.

## Features
- AI assistant for code explanation, improvement, and Q&A (Gemini API)
- Run code in Python, JavaScript, TypeScript, Node.js, Java, Go, Ruby, PHP, C, and C++
- File manager with upload, download, and persistent storage per user
- Modern React frontend with dark theme
- Express/MongoDB backend with JWT authentication

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- (Optional) Gemini API key for AI features

### Local Development

1. Clone the repository:
   ```sh
   git clone <your-repo-url>
   cd codecraft-ide
   ```
2. Install dependencies:
   ```sh
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```
3. Set up environment variables:
   - Copy `env.example` to `.env` and fill in required values (MongoDB URI, Gemini key, etc.)
4. Start the servers:
   ```sh
   npm run start:backend
   npm run start:frontend
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel (Frontend)
- Deploy only the `frontend/` directory as a Vercel project.
- Set the `REACT_APP_API_URL` environment variable in Vercel to your backend API URL (e.g., `https://your-backend.example.com`).
- If deploying backend separately, use a service like Render, Railway, or your own VPS.

### Common Vercel Issues
- **NOT_FOUND**: Make sure you are deploying the `frontend/` folder, not the project root.
- **API Errors**: The frontend must point to a live backend via `REACT_APP_API_URL`.
- **Build Failures**: Ensure all dependencies are installed and the `frontend/package.json` is present.

## License
MIT
