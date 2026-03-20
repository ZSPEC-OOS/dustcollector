# ◈ Dust Collector

Ultra-High-Frequency Micro-Arbitrage Simulator for AO Permaweb

Dust Collector is a sophisticated trading simulator that demonstrates autonomous ultra-high-frequency micro-arbitrage strategies. It simulates the AO (Arweave Operating System) permaweb environment, allowing users to test and optimize trading strategies risk-free before deploying real capital.

## 🎯 Features

- **Real-time Market Simulation**: Live price feeds for 8 major crypto pairs
- **Adaptive Ultra-HF Strategy**: Dynamic frequency adjustment based on market volatility
- **Risk Management**: Circuit breakers, cooldowns, and capital protection
- **Performance Analytics**: Real-time P&L tracking, win rates, and projections
- **Configurable Parameters**: Adjust spread thresholds, trade size, and frequency
- **Multiple Strategies**: Conservative, Balanced, Aggressive, and Adaptive modes
- **Visual Dashboard**: Interactive charts and trade history

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dust-collector.git
cd dust-collector

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

Or push to main branch - GitHub Actions will auto-deploy.

## 📊 How It Works

### Core Concept

Dust Collector targets micro-spreads (0.05-0.15%) through ultra-high-frequency trading (60-600 trades/hour).

### Adaptive Frequency Algorithm

The system automatically adjusts trading frequency based on market conditions:

| Market Regime | Frequency | Min Spread | Expected Daily Return |
|--------------|-----------|------------|----------------------|
| Low Volatility | 6 trades/hr | 0.15% | 0.30% |
| Normal | 30 trades/hr | 0.10% | 1.20% |
| High Volatility | 120 trades/hr | 0.08% | 4.20% |
| Extreme | 300 trades/hr | 0.06% | 9.00% |

## 📈 Performance Projections

Starting with $1.00 capital, 30-day simulation:

| Strategy | Trades/Day | Final Capital | Net Profit | ROI |
|----------|------------|---------------|------------|-----|
| Conservative | 30 | $1.43 | $0.43 | 43% |
| Standard | 120 | $2.16 | $1.16 | 116% |
| Ultra-HF Adaptive | 355 | $8-12 | $7-11 | 700-1100% |

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: GitHub Pages

## 📝 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This is a simulator for educational purposes only.

- Test mode uses simulated data, not real trading
- Past performance does not guarantee future results
- Cryptocurrency trading involves significant risk
- Never trade with money you cannot afford to lose
- This is not financial advice

---

Built with ◈ for the permaweb
