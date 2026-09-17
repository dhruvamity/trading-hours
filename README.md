<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Trading Hours • BTC & XAU/USD Gold Session Tracker

Minimalist institutional session tracker for **BTC/USDT** and **XAU/USD Gold** with real-time liquidity windows, Section 6 protocol schedules, market volatility timelines, and trade session rules. Built 100% on Vite, React 19, TypeScript, and Tailwind CSS v4.

## Features

- **Dedicated Subpages**: Dedicated views for **₿ BTC/USDT** and **🪙 XAU/USD Gold** with URL routing (`/btc` and `/gold` / `/xau`).
- **Live Session Tracking**: Real-time IST (Indian Standard Time), UTC, and ET (New York) clocks synchronized with global market sessions.
- **Section 6 Verified Execution Schedules**: Exact trade windows, scalp pockets, and capital defense dead zones.
- **Quantitative Alpha & Notes**: Empirical data-backed notes including Gold 19:00–20:00 vs 20:00–22:30 PF performance falloff and 00:00–01:00 IST anomalies.
- **Liquidity & Volatility Curves**: Asset-calibrated 24-hour volatility curves and quarter-grid guidelines with real-time needle and scrubbable crosshair.
- **Countdown Timers & Progress Gauges**: Dynamic circular progress rings and LED countdowns to upcoming sessions or session closes.

## Tech Stack

- **Framework**: [Vite](https://vite.dev/)
- **UI**: [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: TypeScript
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or pnpm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/dhruvamity/trading-hours.git
cd trading-hours

# Install dependencies
npm install
```

### Development

Run the Vite development server:

```bash
npm run dev
```

### Production Build

Build for production with TypeScript compilation and Vite bundling:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

Configured out-of-the-box for deployment on Vercel, Netlify, or GitHub Pages.

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## License

MIT