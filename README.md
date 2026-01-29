# AI Ticket Grader

A Next.js application for grading customer support tickets using AI analysis.

## Features

- 🤖 AI-powered ticket analysis using Claude
- 📊 Scoring across 4 categories: Soft Skills, Issue Understanding, Product & Process, Tools Utilization
- 🚨 Zero tolerance detection for legal threats (buzzwords)
- 🔶 Escalation agent detection with adjusted criteria
- 💾 Local storage for saving results
- 📈 **Analytics Dashboard** with:
  - Summary metrics (total evaluations, average score, passing rate, violations)
  - Category performance breakdown
  - Grade distribution
  - Agent performance ranking/leaderboard
  - Evaluator activity tracking
  - Date and agent filters
- 📥 **Export Options**:
  - Export evaluations as CSV
  - Export evaluations as JSON
  - Export analytics report as TXT
- 📱 Responsive design

## Grading System

### Weights
- Soft Skills: 20%
- Issue Understanding: 30%
- Product & Process Knowledge: 30%
- Tools Utilization: 20%

### Zero Tolerance (Buzzwords)
Automatic 0% if agent fails to escalate when customer mentions:
- Legal, Lawyer, Attorney, Lawsuit, Sue, Court
- Chargeback, Dispute charge
- Consumer Affairs, FTC, BBB, Attorney General

### Escalation Team
JB, Arche, Princess, Analie, Randel, Ardylyn - evaluated on resolution quality, not escalation compliance.

## Deployment to Vercel

### Option 1: Deploy with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variable in Vercel dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add `ANTHROPIC_API_KEY` with your API key

### Option 2: Deploy via GitHub

1. Push this code to a GitHub repository

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Add environment variable:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key from https://console.anthropic.com/

4. Deploy!

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` file:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required for AI analysis) |

## Tech Stack

- Next.js 14
- React 18
- Anthropic Claude API
- Local Storage for data persistence
