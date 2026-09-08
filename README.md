<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BTC Session Tracker & Trading Hours

Minimalist Bitcoin trading session tracker with real-time liquidity windows, protocol schedules, market volatility timelines, and trade session rules. Built 100% on Vite, React 19, TypeScript, and Tailwind CSS v4.

## Features

- **Live Session Tracking**: Real-time IST (Indian Standard Time) and UTC clock synchronized with Asian, London, and New York market sessions.
- **Liquidity & Volatility Curve**: Visualized 24-hour liquidity curve and quarter-grid guidelines with real-time needle and scrubbable crosshair.
- **Protocol Schedules & Playbooks**: Detailed trading playbooks, dead zones, swing-only periods, and scalp zones.
- **Countdown Timers**: Dynamic countdowns to upcoming key market events, session open/close, and volatility expansions.
- **Audio & Visual Alerts**: Alerts when entering new market zones and volatility spikes.

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