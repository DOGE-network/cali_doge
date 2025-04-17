# Unoffical California Department of Government Efficency (Cali-DOGE)

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
  - [Running Scripts](#running-scripts)
  - [Linting and Testing](#linting-and-testing)
  - [Deployment](#deployment)
- [Data Architecture](#data-architecture)
  - [Fiscal Year Representation](#fiscal-year-representation)
  - [Data Processing Pipeline](#data-processing)
  - [Executive Branch Hierarchy](#executive-branch-hierarchy)
  - [Data Sources](#data-sources)
- [Key System Components](#key-system-components)
  - [Markdown Processing](#markdown-processing)
  - [Workforce Hierarchy System](#workforce-hierarchy-system)
  - [Department Page Connection System](#department-page-connection-system)
  - [Data Visualization](#data-visualization)
- [Contributing](#contributing)

## Overview
I am the love child of Elon Musk and Lanhee Chen. Godson of David Sacks. A fun mode parody account for educational purposes.

## Project Structure

```
cali_doge/
├── src/
│   ├── app/                 # Next.js 14 app directory
│   ├── components/          # Reusable React components
│   ├── data/               # Data files and JSON
│   ├── lib/                # Utility functions and shared code
│   ├── scripts/            # Data processing and utility scripts
│   ├── styles/             # Global styles and Tailwind config
│   ├── tests/              # Jest test files
│   ├── types/              # TypeScript type definitions
│   └── middleware.ts       # Next.js middleware
├── public/                 # Static assets
├── .github/               # GitHub Actions workflows
├── .husky/                # Git hooks
├── .vscode/              # VS Code settings
└── coverage/             # Test coverage reports
```

## Development

### Prerequisites

- Node.js v18 or later
- npm or yarn
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/cali_doge.git
cd cali_doge
```

2. Install dependencies:
```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory with the following environment variables:

```
NEXT_PUBLIC_API_URL=your_api_url
TWITTER_BEARER_TOKEN=your_twitter_token  # Only needed if using tweet fetching
```

### Running Locally

To run the development server with Turbo mode:

```bash
npm run dev
```

This will start the Next.js development server on [http://localhost:3000](http://localhost:3000).

### Building for Production

To build the application for production:

```bash
npm run build
```

This will:
1. Generate department mappings
2. Build the Next.js application
3. Optimize assets and code

To test the production build locally:

```bash
npm run start
```

### Running Scripts

The project includes several utility scripts:

```bash
# Type checking
npm run typecheck

# Fetch tweets
npm run fetch-tweets

# Generate department mappings
npm run generate-mappings

# Validate department JSON types
npm run validate-departments_json_types

# Download salary data
npm run download-salary

# Process salary data
npm run process-salary
```

### Linting and Testing

To run linting:

```bash
npm run lint
```

To run tests:

```bash
npm test
```

### Deployment

The project is configured for deployment on Vercel. Pushing to the main branch will trigger an automatic deployment to production.

For manual deployment:

```bash
npm run build
vercel deploy --prod
```

## Data Architecture

### Fiscal Year Representation

The website uses fiscal year data for budget and workforce information. Understanding how fiscal years are represented is important for interpreting the data correctly.

#### California Fiscal Year Convention

In California state government:

- A fiscal year spans from July 1 to June 30 of the following calendar year
- Official state documents represent fiscal years as "YYYY-YY" (e.g., "2023-24")
- This indicates the fiscal year begins on July 1, 2023 and ends on June 30, 2024

#### Fiscal Year Representation in Our Data

For simplicity and consistency across our application:

1. **Single Year Format**: We use a single year format (e.g., "2023" instead of "2023-24") in our JSON data files
2. **First Year Convention**: The year we use represents the first year of the fiscal year range
   - Example: "2023" in our data represents the fiscal year "2023-24" (July 1, 2023 to June 30, 2024)

3. **Display Format**: 
   - In data tables, we display just the year number (e.g., "2023")
   - This represents the full fiscal year that begins in that calendar year

### Data Processing Pipeline

The data processing pipeline consists of several stages:

1. **Data Collection**:
   - Workforce data from California State Controller's Office
   - Budget data from eBudget.ca.gov
   - Department information from official sources

2. **Data Processing**:
   - CSV processing for workforce data
   - PDF processing for budget documents
   - Department mapping generation
   - Type validation

3. **Data Storage**:
   - JSON files for structured data
   - Markdown files for department pages
   - Media files for visual content

### Executive Branch Hierarchy

The application maintains a hierarchical representation of California's executive branch structure in the `src/data/executive-branch-hierarchy.json` file. This hierarchy is used for organizational navigation and data visualization.

#### Structure Format

The hierarchy is structured as a nested JSON object with the following key properties:

- **name**: The name of the organizational unit
- **budget_budgetCode**: The California Department of Finance budget budgetCode (when applicable)
- **is_active**: Boolean indicating if the unit is currently active
- **key_functions**: List of primary responsibilities
- **children**: Array of child organizations that report to this unit

## Key System Components

### Markdown Processing

The application uses a sophisticated markdown processing system for content management:

- **Remark Ecosystem**: Uses [remark](https://github.com/remarkjs/remark) and [rehype](https://github.com/rehypejs/rehype) for Markdown-to-HTML conversion
- **Custom Components**: Implements custom MDX components for enhanced content display
- **Frontmatter Support**: Each markdown file contains structured frontmatter for metadata
- **Code Formatting**: Uses Prettier for consistent code formatting in markdown files

### Workforce Hierarchy System

The application includes an interactive workforce hierarchy visualization system that:

- **Renders Organizational Structure**: 
  - Visualizes the executive branch organizational chart
  - Supports collapsible/expandable nodes for navigation
  - Provides detail views for each organizational unit

- **Data Structure**:
  - Uses a tree-based structure defined in `src/data/executive-branch-hierarchy.json`
  - Maps departments to their parent agencies
  - Includes metadata like budget budgetCodes and key functions

### Department Page Connection System

The system uses a sophisticated matching algorithm to connect department data with their corresponding markdown pages and handle department links:

#### Markdown Matching System

The `findMarkdownForDepartment` function implements a multi-stage matching process:
1. **Exact Name Match**: First attempts to find a direct match using the department name
2. **Code Match**: Checks if the department slug exists in `DEPARTMENT_SLUGS_WITH_PAGES`
3. **Normalized Name Match**: Tries matching based on normalized department names (removing special characters, etc.)
4. **Prefix Handling**: Handles "California" prefix variations
5. **Fuzzy Search**: Uses fuzzy search as a last resort for partial matches

#### Department Link Generation

In the workforce page, department links are generated through two mechanisms:
1. **Department Page Links**: Links to detailed department pages using markdown slugs
   - Format: `/departments/${markdownSlug}`
   - Only shown if a matching markdown file exists
2. **Workforce Data Links**: Links to workforce-specific data views
   - Format: `/workforce?department=${encodeURIComponent(department.name)}`
   - Available for all departments regardless of markdown existence

#### API Integration

The system integrates with several APIs to provide comprehensive department data:

1. **Department Data API**:
   - Endpoint: `/api/departments?format=departments`
   - Returns structured department data including:
     - Organization hierarchy
     - Budget codes
     - Workforce statistics
     - Distribution data for tenure, salary, and age

2. **Data Validation**:
   - Type checking against `DepartmentData` interface
   - Validation of required fields and data formats
   - Logging of validation results and errors

3. **Hierarchy Construction**:
   - Builds department hierarchy based on parent-child relationships
   - Handles department aliases and alternative names
   - Aggregates statistics across organizational levels

### Data Visualization

The application includes a data visualization system that:

- **Renders Visual Content**: 
  - Provides visual representations of workforce data
  - Supports interactive charts and graphs
  - Displays data in a user-friendly format

## Contributing

Please see CONTRIBUTING.md for guidelines on contributing to this project.
