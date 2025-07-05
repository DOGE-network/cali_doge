# California DOGE

California government transparency platform. Independent analysis of state spending, workforce, and operations data.

[![Version](public/badges/version.svg)](https://github.com/DOGE-network/cali_doge)
[![Node.js](public/badges/node.svg)](https://nodejs.org/)
[![TypeScript](public/badges/typescript.svg)](https://www.typescriptlang.org/)
[![Next.js](public/badges/next.js.svg)](https://nextjs.org/)
[![License](public/badges/license.svg)](https://creativecommons.org/licenses/by/4.0/)
[![License](public/badges/licenseApache.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Data Rows](public/badges/data-rows.svg)](https://cali-doge.org)
[![Coverage](public/badges/coverage.svg)](https://cali-doge.org)
[![Build](public/badges/build.svg)](https://cali-doge.org)

## Quick Start

```bash
git clone https://github.com/DOGE-network/cali_doge.git
cd cali_doge
npm install
npm run dev
```

## What This Does

- **Search**: Multi-dimensional search across departments, vendors, programs, funds
- **Spending Analysis**: Track vendor payments, department budgets, program spending
- **Workforce Data**: Salary and employment data
- **Department Pages**: Detailed analysis of departments

## Development

### Prerequisites
- Node.js 18+
- npm

### Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run all tests
npm run test:coverage   # Generate coverage report
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests

# Code Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript check

# Data Processing
npm run fetch-tweets    # Update Twitter data
npm run process-vendors # Process vendor data
npm run process-budgets # Process budget data
npm run download-salary # Download salary data
```

## Project Structure

```
src/
├── app/                 # Next.js 14 app directory
├── components/          # React components
├── lib/                # Utilities and shared code
├── data/               # JSON data files
├── scripts/            # Data processing scripts
└── types/              # TypeScript definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

### Code Standards

- TypeScript for type safety
- ESLint + Prettier for formatting
- Jest and postman for testing
- Husky pre-commit hooks

## API Endpoints

- `GET /api/search` - Multi-dimensional search
- `GET /api/spend` - Spending data analysis
- `GET /api/departments` - Department information
- `GET /api/programs/[code]` - Program details

## License

Apache 2.0 and CC-BY 4.0 - See [LICENSE.md](LICENSE.md)

## Links

- [Live Site](https://cali-doge.org)
- [Search Database](https://cali-doge.org/search)
- [Spending Analysis](https://cali-doge.org/spend)
