# Unoffical California Department of Government Efficency (Cali-DOGE)

## Table of Contents

- [Overview](#overview)
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
- [California Government Structure](#california-government-organizational-structure)
  - [Hierarchical Levels](#hierarchical-levels)
  - [Agency Structure](#agency-level-a)
  - [Budget Documents](#budget-document-structure)
- [Scripts and Tools](#scripts)
  - [Data Processing Scripts](#data-processing-scripts)
  - [Social Media Scripts](#social-media-scripts)
  - [PDF Processing Scripts](#pdf-processing-scripts)
  - [Utility Scripts](#utility-scripts)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
  - [Running Scripts](#running-scripts)
  - [Linting and Testing](#linting-and-testing)
  - [Deployment](#deployment)
- [Data Strategy](#data-strategy)
  - [Data Gathering](#1-data-gathering)
  - [Data Processing](#2-data-processing)
  - [Data Presentation](#3-data-presentation)
- [Contributing](#contributing)

## Overview
I am the love child of Elon Musk and Lanhee Chen. Godson of David Sacks. A fun mode parody account for educational purposes.

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

### Implementation in Data Files

This convention is applied consistently across our data sources:

- **Spending Data** (`src/data/spending-data.json`): Each entry includes the fiscal year in single-year format
- **Workforce Data** (`src/data/workforce-data.json`): Demographic and employment statistics are organized by fiscal year
- **Department Data** (`src/data/departments.json`): Historical data is organized chronologically by fiscal year
- **Budget Documentation**: All budget documents follow the fiscal year naming conventions

When interpreting any data, charts, or visualizations on the site, remember that a year value like "2023" refers to the entire fiscal year period from July 1, 2023, through June 30, 2024.

### Executive Branch Hierarchy

The application maintains a hierarchical representation of California's executive branch structure in the `src/data/executive-branch-hierarchy.json` file. This hierarchy is used for organizational navigation and data visualization.

#### Structure Format

The hierarchy is structured as a nested JSON object with the following key properties:

- **name**: The name of the organizational unit
- **budget_budgetCode**: The California Department of Finance budget budgetCode (when applicable)
- **is_active**: Boolean indicating if the unit is currently active
- **key_functions**: List of primary responsibilities
- **children**: Array of child organizations that report to this unit

#### Hierarchy Levels

The hierarchy follows the official California Department of Finance organizational structure:

1. **Governor**: Top level of the hierarchy
2. **Agency Level**: Major cabinet-level agencies
3. **Department Level**: Departments, boards, commissions, and other units
4. **Division Level**: Major subdivisions within departments (when available)

#### Usage in the Application

This hierarchy powers several features:

- The organizational chart visualization in the workforce section
- Navigation between related departments
- Context for understanding department functions and relationships
- Budget budgetCode lookup for connecting with spending data

The hierarchy structure is validated during build time to ensure consistent structure and prevent duplicates.

## Markdown Processing and Source Formatting

The website uses a custom Markdown processing system to render content with enhanced features, particularly for handling sources and references.

### Markdown to HTML Conversion

The core Markdown processing is handled in `src/lib/blog.ts` using the remark ecosystem:

- **Base Processing**: Uses `remark()` with `remarkGfm` plugin to support GitHub Flavored Markdown (tables, strikethrough, etc.)
- **HTML Conversion**: Converts Markdown to HTML using `remark-html` with `sanitize: false` and `allowDangerousHtml: true` to allow custom HTML
- **Content Cleaning**: Removes Jekyll templating and adjusts image paths before processing

### Source Reference System

A specialized function `processSources()` enhances the Markdown processing by:

1. **Detecting Source Sections**: Identifies "Sources:" sections in the Markdown content
2. **Parsing References**: Extracts numbered references like `[1] https://example.com Description text`
3. **Formatting Sources**: Converts the plain text sources into a structured HTML format with:
   - Unique IDs for each source
   - Proper styling and layout
   - Link formatting with target="_blank"
4. **Reference Linking**: Transforms in-text references (e.g., `[1]`, `[2]`) into clickable links that jump to the corresponding source

### How to Use Source References

To add properly formatted sources to a Markdown file:

1. Add a "Sources:" section at the end of your Markdown file
2. List each source on a new line in the format: `[number] URL optional description`
3. Reference sources in your content using the format `[number]`

Example:
```markdown
This is a statement that needs a citation[1].

Sources:
[1] https://example.com/data This is the source description
[2] https://another-example.com/info
```

The processor will automatically:
- Format the sources section with proper styling
- Make the `[1]` reference clickable, linking to the source
- Apply consistent styling to all sources

### CSS Styling

The source references are styled using custom CSS in `src/styles/globals.css`:

- Source list has a top border and consistent spacing
- Each source item has left padding for the reference number
- Reference numbers are positioned absolutely for alignment
- In-text references are styled as superscript with appropriate colors

### Debugging Source Formatting

If sources aren't displaying correctly, check these common issues:

1. **Source Format**: Each source must be on its own line and follow the exact format `[number] URL optional description`
2. **Source Section**: The "Sources:" heading must be followed by a newline before listing sources
3. **Reference Format**: In-text references must be in the format `[number]` without any additional characters
4. **Line Breaks**: Ensure there are no unexpected line breaks within a source entry
5. **URL Format**: URLs must start with http:// or https://

To debug the source processing:

```typescript
// Add this temporarily to src/lib/blog.ts to see the parsed sources
console.log('Sources found:', sources);
console.log('Source section match:', sourcesMatch);
```

You can also inspect the HTML output in the browser's developer tools to see how the sources are being rendered.

## Workforce Hierarchy System

The website includes a comprehensive workforce hierarchy visualization system that displays the organizational structure of California's government agencies.

### Data Structure

The workforce hierarchy is built on a multi-level nested structure:

1. **Level 0**: Executive Branch (root)
2. **Level 1**: Categories (Superagencies and Departments, Standalone Departments, etc.)
3. **Level 2**: Agencies (Government Operations Agency, Transportation Agency, etc.)
4. **Level 3**: Sub-agencies (Department of General Services, Caltrans, etc.)

The hierarchy is defined in `src/data/executive-branch-hierarchy.json` and follows this structure:

```json
{
  "agencyName": "Executive Branch",
  "subAgencies": {
    "Superagencies and Departments": [
      {
        "name": "Government Operations Agency",
        "subAgencies": [
          {
            "name": "Department of General Services",
            "reportsTo": "Agency Secretary",
            "keyFunctions": "Procurement, state buildings"
          },
          // More sub-agencies...
        ]
      },
      // More agencies...
    ],
    // More categories...
  }
}
```

### Agency Type Definition

Each agency in the hierarchy is represented by the `Agency` interface defined in `src/app/workforce/types.ts`:

```typescript
export interface Agency {
  name: string;
  abbreviation?: string;
  description?: string;
  website?: string;
  subAgencies?: Agency[];
  headCount?: number;
  subordinateOffices?: number;
  totalWages?: number;
  tenureDistribution?: { [key: string]: number };
  salaryDistribution?: { [key: string]: number };
  ageDistribution?: { [key: string]: number };
  averageTenureYears?: number;
  averageSalary?: number;
  averageAge?: number;
}
```

### Hierarchy Processing

The workforce hierarchy is processed in `src/app/workforce/page.tsx` through several key functions:

1. **`convertExecutiveBranchToAgency`**: Transforms the raw JSON data into the Agency structure
   - Processes each category of sub-agencies
   - Calculates subordinate office counts
   - Creates a consistent hierarchical structure

2. **`mergeAgencyData`**: Combines the hierarchy structure with statistical data
   - Maps agency names between different data sources
   - Handles special case naming differences
   - Recursively applies data to the entire hierarchy

3. **`findAgencyByPath`**: Navigates the hierarchy to find specific agencies
   - Follows a path of agency names to locate a specific node
   - Used for navigation and selection

### Visualization Components

The hierarchy is visualized through several React components:

1. **`AgencyCard`**: Displays individual agency information
   - Shows name, abbreviation, and description
   - Indicates the number of subordinate offices
   - Highlights active selections

2. **`AgencySection`**: Renders a section of the hierarchy
   - Manages the display of parent-child relationships
   - Handles navigation state

3. **`SubAgencySection`**: Renders child agencies
   - Shows only immediate children of the active agency
   - Maintains the hierarchical visual structure

### Navigation Logic

The system implements an intuitive navigation approach:

- When nothing is selected, shows the Executive Branch (Level 0) with data and charts
- When an agency is selected, shows the path to root (ancestors) without data
- Always displays the active card with its data and charts
- Shows only immediate children of the active card without their data
- Hides all other branches for clarity

This approach allows users to navigate the complex government structure while maintaining context and focus.

## Department Page Connection System

The website implements a cross-linking system that connects department pages with their corresponding entries in the spending and workforce pages. This system ensures users can easily navigate between different views of the same department's data.

### Connection Architecture

The connection system is built on a mapping framework defined in `src/lib/departmentMapping.ts`:

1. **Central Mapping Registry**: A single source of truth that maps each department to its representations across different data sources:
   ```typescript
   export interface DepartmentMapping {
     slug: string;           // The slug used in department URLs
     fullName: string;       // The full official name
     spendingName?: string;  // The name used in spending data (if different from fullName)
     workforceName?: string; // The name used in workforce data (if different from fullName)
   }
   ```

2. **Lookup Functions**: A set of utility functions that enable bidirectional lookups:
   - `getDepartmentBySlug`: Finds department data using the URL slug
   - `getDepartmentBySpendingName`: Finds department data using the name in spending datasets
   - `getDepartmentByWorkforceName`: Finds department data using the name in workforce datasets

3. **URL Generation**: Functions that create properly formatted URLs for cross-navigation:
   - `getSpendingUrlForDepartment`: Creates a URL to the spending page filtered for a specific department
   - `getWorkforceUrlForDepartment`: Creates a URL to the workforce page filtered for a specific department

### Implementation in Components

The connection system is implemented in several key components:

1. **Department Page** (`src/app/departments/[slug]/page.tsx`):
   - Uses `getDepartmentBySlug` to load department information
   - Uses `getSpendingUrlForDepartment` and `getWorkforceUrlForDepartment` to create navigation links

2. **Workforce Visualization** (`src/app/workforce/AgencyDataVisualization.tsx`):
   - Uses `getDepartmentByWorkforceName` to check if a department page exists for the current agency
   - Creates "Details" links that navigate to the corresponding department page

3. **Spending Page** (`src/app/spend/page.tsx`):
   - Uses `getDepartmentBySpendingName` to check if a department page exists for the current spending entry
   - Creates links that navigate to the corresponding department page

### How to Update When Creating New Department Pages

When creating a new department page, follow these steps to ensure proper cross-linking:

1. **Add a New Mapping Entry**:
   Add a new entry to the `departmentMappings` array in `src/lib/departmentMapping.ts`:
   ```typescript
   {
     slug: '3900_air_resources_board',  // Format: <dept_budgetCode>_<name_in_snake_case>
     fullName: 'Air Resources Board',  // Official name
     spendingName: 'Air Resources Board',  // Optional: only if different from fullName
     workforceName: 'Air Resources Board'  // Optional: only if different from fullName
   }
   ```

2. **Create the Department Page**:
   Create a new markdown file at `src/app/departments/posts/<dept_budgetCode>_<name_in_snake_case>.md` using the same format as the slug.
   Example: `src/app/departments/posts/3900_air_resources_board.md`

3. **Verify Data Consistency**:
   - Ensure the `spendingName` matches exactly how the department appears in `src/data/spending-data.json`
   - Ensure the `workforceName` matches exactly how the department appears in `src/data/workforce-data.json`
   - If names differ slightly between datasets, use the optional fields to specify the exact names

4. **Test Cross-Navigation**:
   After implementation, test that:
   - The department page has working links to spending and workforce pages
   - The department appears correctly in the workforce visualization with a "Details" link
   - The department appears correctly in the spending page with a link to its department page

### Troubleshooting Connection Issues

If cross-linking is not working correctly:

1. **Check Name Consistency**: Verify that the names in the mapping exactly match the names in the data files
2. **Verify Slug Format**: Ensure the slug is URL-friendly (lowercase, hyphens instead of spaces)
3. **Check Component Implementation**: Ensure the components are using the lookup functions correctly
4. **Debug with Console Logs**: Add temporary console logs to trace the mapping process:
   ```typescript
   console.log('Looking up department:', name);
   console.log('Found mapping:', getDepartmentByWorkforceName(name));
   ```

## Data Sources

Example data structure:

```json
{
  "name": "Executive Branch",
  "headCount": 2252162,
  "totalWages": 211300000000,
  "tenureDistribution": {
    "<1": 217955,
    "1-4": 311367,
    "5-9": 298450,
    "10-19": 287632,
    "20-24": 198450,
    "25+": 156308
  },
  "salaryDistribution": {
    "60-70k": 298450,
    "70-80k": 287632,
    "80-90k": 128463,
    "90-100k": 98450,
    "100-110k": 78632,
    "110-120k": 58450,
    "120-130k": 48632,
    "130-140k": 38450,
    "140-150k": 28632,
    "150-160k": 18450
  },
  "ageDistribution": {
    "25-29": 217955,
    "30-34": 287632,
    "35-39": 292848,
    "40-44": 198450,
    "45-49": 156308,
    "50-54": 98450,
    "55-59": 58632,
    "60+": 28632
  },
  "averageTenureYears": 10,
  "averageSalary": 93828,
  "averageAge": 47
}
```

## Tweet Fetching Script

The repository includes an automated tweet fetching system (`src/scripts/fetch-tweets.ts`) that efficiently manages tweet collection and storage. Here's how it works:

### Key Features

- **Incremental Updates**: Only fetches new tweets since the last run using Twitter's `since_id` parameter
- **Rate Limit Aware**: Implements rate limit checking to prevent API abuse
- **Media Management**: 
  - Downloads and stores media files locally
  - Maintains unique filenames based on tweet IDs
  - Updates media URLs to point to local copies
- **URL Enrichment**:
  - Fetches metadata for URLs in tweets (title, description)
  - Extracts OpenGraph/Twitter card images
  - Validates image URLs
- **Data Organization**:
  - Merges new tweets with existing archive
  - Deduplicates user information
  - Maintains chronological order
  - Preserves metadata about newest and oldest tweet IDs

### API Integration

The script utilizes Twitter v2 API to fetch comprehensive tweet data including:
- Tweet fields: creation date, attachments, author, entities, context
- User fields: username, name, profile picture
- Media fields: URLs, dimensions, type

### Storage Structure

- Tweet data: `src/data/tweets/tweets.json`
- Media files: `src/data/media/`
- Rate limit info: `src/data/tweets/rate_limit.json`

The script is designed to run regularly (e.g., via GitHub Actions) while minimizing API usage and maintaining a complete local archive of tweets and associated media.

## California State Government Organizational Structure

According to the [Department of Finance's Uniform Codes Manual](https://dof.ca.gov/wp-content/uploads/sites/352/Accounting/Policies_and_Procedures/Uniform_Codes_Manual/UCM_2-Organization_Codes-Introduction.pdf), California state government organization budgetCodes are structured in five hierarchical levels:

### Hierarchical Levels
- **Level A**: Agency level - Groups of departments under agency secretaries or broad functional groupings
- **Level B**: Subagency level - Breakdown of agencies into subagency groupings
- **Level 1**: Department level - Organizations that normally receive appropriations
- **Level 2**: Suborganization level - Divisions, bureaus, boards, or commissions
- **Level 3**: Suborganization of Level 2 - Bureaus, offices, or units

### Agency (Level A)
| Code Range | Agency |
|------------|----------------|
| 0000-0999 | State Operations |
| 1000-1999 | Legislative, Judicial, Executive |
| 2000-2999 | Business, Transportation & Housing |
| 3000-3999 | Resources and Environmental Protection |
| 4000-4999 | Health and Human Services |
| 5000-5999 | Corrections and Rehabilitation |
| 6000-6999 | Education |
| 7000-7999 | Government Operations |
| 8000-8999 | General Government |
| 9000-9999 | Capital Outlay |

### Budget Document Structure
Budget documents follow the URL pattern:
```
ebudget.ca.gov/[FISCAL-YEAR]/pdf/[DOCUMENT-TYPE]/[AGENCY-CODE]/[DEPARTMENT-CODE].pdf
```

### Budget Document Types

The budget documents are available in different forms throughout the fiscal year cycle:

1. **Current Year (2024-25)**
   - **Governor's Proposed Budget** (January): Initial budget proposal released by January 10
   - **May Revision** (May): Updated proposal incorporating latest economic and revenue information
   - **Enacted Budget** (June/July): Final approved budget after legislative process

2. **Previous Years**
   - **Enacted Budget**: Final approved version with all amendments
   - **Budget Act**: Initial enacted version before amendments
   - **Trailer Bills**: Implementing legislation for budget provisions

### Budget Document URLs

Budget documents follow the URL pattern:
```
ebudget.ca.gov/[FISCAL-YEAR]/pdf/[DOCUMENT-TYPE]/[AGENCY-CODE]/[DEPARTMENT-CODE].pdf
```

### California department of finance budgetCodes
https://dof.ca.gov/accounting/accounting-policies-and-procedures/accounting-policies-and-procedures-uniform-budgetCodes-manual-organization-budgetCodes/

### structural listing of budgetCodes
https://dof.ca.gov/wp-content/uploads/sites/352/2024/07/3orgstruc.pdf

### glossary of terms
https://ebudget.ca.gov/reference/GlossaryOfTerms.pdf

# California Government Organizational Structure Parser

## Overview

This project includes tools to parse and analyze the organizational structure of California state government from official PDF documents. The system extracts hierarchical relationships between agencies, departments, and other organizational units based on their position in the document.

## Scripts

The project includes various utility scripts for data processing, maintenance, and development tasks. These scripts are located in the `src/scripts` directory and serve different purposes in the application lifecycle.

### Data Processing Scripts

#### `mergeDataSources.js`
- **Purpose**: Merges spending and workforce data into a unified departments.json file
- **Operations**:
  - Reads data from separate spending and workforce JSON files
  - Normalizes department names for consistent matching
  - Generates slugs for department URLs
  - Creates a unified data structure with all information
  - Adds validation to ensure data integrity
- **Usage**: Run once to initialize or rebuild the departments.json file

#### `updateDepartmentCodes.js`
- **Purpose**: Updates department budgetCodes in departments.json based on budget document filenames
- **Operations**:
  - Scans budget document files in the data directory
  - Extracts department budgetCodes from filenames
  - Matches department names using normalization
  - Updates the corresponding entries in departments.json
- **Usage**: Run after adding new budget documents to update department budgetCodes

#### `generate-department-mappings.js`
- **Purpose**: Generates department mappings for the application
- **Operations**:
  - Reads all department markdown files
  - Extracts department metadata
  - Creates mappings between slugs and department names in different contexts
  - Updates the departmentMapping.ts file with the latest mappings
- **Usage**: Run during build process to ensure mappings are up to date

### Social Media Scripts

#### `fetch-tweets.ts`
- **Purpose**: Fetches tweets from Twitter API and stores them locally
- **Operations**:
  - Performs incremental updates (only fetches new tweets)
  - Respects Twitter API rate limits
  - Downloads and stores media files locally
  - Enriches tweets with URL metadata
  - Merges new tweets with existing archive
- **Usage**: Run regularly to update the tweets.json file and media directory

#### `remove-tweets.js`
- **Purpose**: Removes specific tweets from the local tweets.json file
- **Operations**:
  - Takes a list of tweet IDs to remove
  - Filters out those tweets from the dataset
  - Updates the tweets.json file
- **Usage**: Run when specific tweets need to be removed from the site

### PDF Processing Scripts

#### `extract_pdf_text.py`
- **Purpose**: Extracts text from PDF budget documents
- **Operations**:
  - Uses PyMuPDF to parse PDF files
  - Extracts text content while preserving structure
  - Saves extracted text to files for further processing
- **Usage**: Run to extract text from new budget document PDFs

#### `extract_budgetCodes.py`
- **Purpose**: Parses California government organizational structure from PDF documents
- **Operations**:
  - Analyzes horizontal positions of budgetCodes and descriptions
  - Classifies entries into hierarchical levels (A, B, 1, 2, 3)
  - Extracts budgetCodes, descriptions, and hierarchy information
  - Outputs structured data to CSV
- **Usage**: Run to update the organizational structure data

#### `download_budgets.sh`
- **Purpose**: Downloads budget documents for California state government entities
- **Operations**:
  - Uses organizational structure data to identify departments
  - Constructs URLs for budget documents
  - Downloads documents for specified fiscal years
  - Organizes files in a consistent directory structure
- **Usage**: Run to download budget documents for new fiscal years

### Utility Scripts

#### `load-env.ts`
- **Purpose**: Manages environment variable loading for scripts
- **Operations**:
  - Detects running environment (local vs. GitHub Actions)
  - Loads appropriate environment variables
  - Provides fallback mechanisms for different environments
- **Usage**: Imported by other TypeScript scripts that need environment variables

By leveraging these scripts, the project maintains data consistency, automates repetitive tasks, and ensures proper connections between different data sources in the application.

## Key System Components

### Markdown Processing

The application uses a sophisticated markdown processing system for content management:

- **Remark Ecosystem**: Uses [remark](https://github.com/remarkjs/remark) and [rehype](https://github.com/rehypejs/rehype) for Markdown-to-HTML conversion
- **Custom Components**: Implements custom MDX components for enhanced content display:
  - Expandable sections
  - Interactive charts
  - Department callouts
  - Budget comparisons
- **Frontmatter Support**: Each markdown file contains structured frontmatter for metadata:
  - Title, date, author
  - Department references
  - Related links
  - Keywords and tags
- **Code Formatting**: Uses Prettier for consistent budgetCode formatting in markdown files

The markdown processing pipeline includes:
1. Parsing frontmatter metadata
2. Converting markdown to HTML
3. Applying syntax highlighting
4. Transforming custom components
5. Optimizing output for performance

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

- **Component Architecture**:
  - `AgencyHierarchyTree`: Top-level component managing the hierarchy
  - `AgencyNode`: Individual node component with expand/collapse
  - `AgencyDetail`: Detail panel showing expanded information
  - `AgencySearch`: Search component for finding specific agencies

- **Integration Points**:
  - Connects with department pages via mapping system
  - Links to budget data through budget budgetCodes
  - Provides navigation to related workforce data

### Department Page Connection System

The application implements a mapping system to connect different data sources through department pages:

#### Mapping Framework

The mapping system (`src/lib/departmentMapping.ts`) creates connections between:
- Department pages (markdown content)
- Spending data entries
- Workforce visualization nodes

#### Key Components

- **Mapping Definition**: Each department has a mapping entry with:
  - `slug`: URL-friendly identifier used in department pages
  - `fullName`: Official department name
  - `spendingName`: Name as it appears in spending data (if different)
  - `workforceName`: Name as it appears in workforce data (if different)

- **Lookup Functions**:
  - `getDepartmentBySlug`: Finds department mapping by URL slug
  - `getDepartmentBySpendingName`: Looks up department from spending data names
  - `getDepartmentByWorkforceName`: Looks up department from workforce data names
  - `getSpendingUrlForDepartment`: Generates URL to spending page for a department
  - `getWorkforceUrlForDepartment`: Generates URL to workforce visualization for a department

#### Cross-Navigation Implementation

1. **Department Page** (`src/app/departments/[slug]/page.tsx`):
   - Uses `getDepartmentBySlug` to load department information
   - Uses `getSpendingUrlForDepartment` and `getWorkforceUrlForDepartment` to create navigation links

2. **Workforce Visualization** (`src/app/workforce/AgencyDataVisualization.tsx`):
   - Uses `getDepartmentByWorkforceName` to check if a department page exists for the current agency
   - Creates "Details" links that navigate to the corresponding department page

3. **Spending Page** (`src/app/spend/page.tsx`):
   - Uses `getDepartmentBySpendingName` to check if a department page exists for the current spending entry
   - Creates links that navigate to the corresponding department page

#### How to Update When Creating New Department Pages

When creating a new department page, follow these steps to ensure proper cross-linking:

1. **Add a New Mapping Entry**:
   Add a new entry to the `departmentMappings` array in `src/lib/departmentMapping.ts`:
   ```typescript
   {
     slug: '3900_air_resources_board',  // Format: <dept_budgetCode>_<name_in_snake_case>
     fullName: 'Air Resources Board',  // Official name
     spendingName: 'Air Resources Board',  // Optional: only if different from fullName
     workforceName: 'Air Resources Board'  // Optional: only if different from fullName
   }
   ```

2. **Create the Department Page**:
   Create a new markdown file at `src/app/departments/posts/<dept_budgetCode>_<name_in_snake_case>.md` using the same format as the slug.
   Example: `src/app/departments/posts/3900_air_resources_board.md`

3. **Verify Data Consistency**:
   - Ensure the `spendingName` matches exactly how the department appears in `src/data/spending-data.json`
   - Ensure the `workforceName` matches exactly how the department appears in `src/data/workforce-data.json`
   - If names differ slightly between datasets, use the optional fields to specify the exact names

4. **Test Cross-Navigation**:
   After implementation, test that:
   - The department page has working links to spending and workforce pages
   - The department appears correctly in the workforce visualization with a "Details" link
   - The department appears correctly in the spending page with a link to its department page

#### Troubleshooting Connection Issues

If cross-linking is not working correctly:

1. **Check Name Consistency**: Verify that the names in the mapping exactly match the names in the data files
2. **Verify Slug Format**: Ensure the slug is URL-friendly (lowercase, hyphens instead of spaces)
3. **Check Component Implementation**: Ensure the components are using the lookup functions correctly
4. **Debug with Console Logs**: Add temporary console logs to trace the mapping process:
   ```typescript
   console.log('Looking up department:', name);
   console.log('Found mapping:', getDepartmentByWorkforceName(name));
   ``` 

## Development

### Getting Started

To get started with this project, you'll need the following prerequisites:

- Node.js (v18 or later)
- npm or yarn
- Git

### Installing Dependencies

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

To run the development server:

```bash
npm run dev
```

This will start the Next.js development server on [http://localhost:3000](http://localhost:3000).

### Building for Production

To build the application for production:

```bash
npm run build
```

To test the production build locally:

```bash
npm run start
```

### Running Scripts

To run any of the data processing or utility scripts:

```bash
# For JavaScript scripts
node src/scripts/scriptName.js

# For TypeScript scripts
npx ts-node src/scripts/scriptName.ts

# For Python scripts
python src/scripts/scriptName.py
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

# California State Government Workforce Data

A comprehensive visualization of California State Government workforce data, including employee counts, salaries, and organizational relationships.

## Data Strategy

### 1. Data Gathering
- Source data from California State Controller's Office workforce CSV files
- Files are stored in `src/data/workforce` with naming pattern `YYYY_*.csv`
- Each file contains detailed employee records with:
  - Base wages and benefits
  - Department/subdivision information
  - Employment type and status

### 2. Data Processing
The data processing pipeline consists of several stages:

#### a. CSV Processing (`src/scripts/process_departments.js`)
- Reads and parses workforce CSV files
- Calculates department-level statistics:
  - Total headcount
  - Total wages and benefits
  - Average salary (total compensation)
  - Salary distributions
  - Age and tenure distributions
- Maintains parent-child relationships between departments
- Updates `departments.json` with processed data

#### b. Data Structure
- Departments are organized in a hierarchical structure
- Each department contains:
  ```typescript
  {
    name: string;
    workforce: {
      headCount: { yearly: Record<string, number> };
      wages: { yearly: Record<string, number> };
      salaryDistribution: Array<{range: [number, number], count: number}>;
      // ... other metrics
    }
  }
  ```

### 3. Data Presentation
The application uses several optimization strategies for efficient data presentation:

#### a. Performance Optimizations
- Server-side caching with revalidation
- Dynamic imports for chart components
- Intersection Observer for lazy loading
- Memoized calculations for expensive operations

#### b. Component Structure
- Root level: `WorkforcePage`
  - Handles data fetching and state management
  - Builds department hierarchy
  - Manages navigation and filtering
- Visualization: `AgencyDataVisualization`
  - Dynamically loaded charts
  - Responsive data displays
  - Interactive tooltips and filters

#### c. Data Loading Strategy
```typescript
// Server-side caching
const response = await fetch('/api/departments', {
  next: { revalidate: 3600 }
});

// Dynamic imports
const DynamicCharts = dynamic(
  () => import('./components/DepartmentCharts'),
  { ssr: false }
);

// Intersection Observer for lazy loading
const observer = new IntersectionObserver(
  ([entry]) => {
    setIsVisible(entry.isIntersecting);
  }
);
```

## Development

### Prerequisites
- Node.js 16+
- npm

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Place workforce CSV files in `src/data/workforce`
4. Run data processing: `node src/scripts/process_departments.js`
5. Start development server: `npm run dev`

### Data Updates
To update workforce data:
1. Add new CSV files to `src/data/workforce`
2. Run processing script
3. Verify updates in `departments.json`
4. Test visualizations in development environment

## Contributing
Please see CONTRIBUTING.md for guidelines on contributing to this project.
