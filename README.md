# Unoffical California Department of Government Efficency (Cali-DOGE)

## Table of Contents

- [Overview](#overview)
- [California Government Structure Explained](#california-government-structure-explained)
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
Our Mission
We analyze government spending and regulations through a three-layer approach:

People: Understanding workforce distribution and roles
Infrastructure: Analyzing physical assets and operational costs
Services & IT: Examining digital infrastructure and service delivery
Our goal is to provide clear, actionable insights that can lead to more efficient government operations and better public services

## California Government Structure Explained

### Workforce Organization as we see it

The structure outlined in publicpay, fiscal, and ebudget sites conflict slightly. Using some basic logic and understanding of how organizations work in practice, the workforce hierarchy represents that structure

### Organizational, Budget, Entity, Program, Project, Grant ID, Portal ID, oh my codes

There is a complex naming and numbering structure. Here it it explained with sources. 

#### Department of Finance

**Program and Project code structure**: Department programs are coded with a ten-digit (numeric) code. The first 7 digits of the Program code is also used as the Project code. 

| Program | Element | Component | Task |
| ------- | ------- | --------- | ---- |
| XX      | XX      | XXX       | XXX  |

https://dof.ca.gov/accounting/accounting-policies-and-procedures/department-program-codes/

**Budget Appropriation code structure**: 

The structure for identifying appropriations in the budget is:
Business Unit (organization code) – Reference Code – Fund Code

| Org/BU/Budget | Reference | Fund |
| ------- | ------- | --------- |
| XXXX     | XXX      | XXXX       |

- Example: 2720-001-0044
Where 2720 is the business unit/organization/organizational code for the California Highway Patrol
- Example: 2017 organizational codes for all departments https://ebudget.ca.gov/budget/publication/#/e/2017-18/DepartmentIndex
- Organization Codes https://dof.ca.gov/accounting/accounting-policies-and-procedures/accounting-policies-and-procedures-uniform-codes-manual-organization-codes/

**All the codes explained**

**1. Organization/Business Unit Code (4 digits)**  
- **Definition:** Identifies a state department, agency, or entity. The terms “organizational code,” “organization code,” and “business unit code” all refer to the same four-digit identifier used to represent a department or entity in the California state budget and fiscal systems. Used for budgeting, accounting, and fiscal reporting across all state agencies. 
- **Example:** `0280` = Commission on Judicial Performance.  
- **Source:**  
  - Defined in the **Uniform Codes Manual** https://www.dgs.ca.gov/Resources/SAM/TOC/7100/7131  ,  https://dof.ca.gov/wp-content/uploads/sites/352/Accounting/Policies_and_Procedures/Uniform_Codes_Manual/18fndsrc.pdf  
  - Used in budget documents (ebudget.ca.gov) and FI$Cal.  

---

**2. Program Code (2 digits)**  
- **Definition:** Part of a 10-digit code structure (`Program-Element-Component.Task`) used internally for accounting. The **2-digit program code** categorizes major functions (e.g., education, corrections).  In California state government, a program is an organized set of activities or services designed to achieve specific policy goals or address particular public needs. Programs are typically established by legislation or administrative authority and are funded through the state budget. 
- **Example:** `98` = State-Mandated Local Programs.  
- **Source:**  
  - Defined in the **Department of Finance (DOF) Program Coding Structure** https://dof.ca.gov/accounting/accounting-policies-and-procedures/department-program-codes/  
  - Not directly visible in ebudget.ca.gov, which aggregates codes for simplicity.  

---

**3. Program Code in ebudget.ca.gov (4 digits)**  
- The 4-digit "program codes" in ebudget.ca.gov are actually **Program + Element codes** from the 10-digit structure.  
  - **Example:** `9801` = Program `98` (State-Mandated Local Programs) + Element `01` (a specific subprogram).  
- **Why It’s Confusing:**  
  ebudget.ca.gov simplifies the display by combining the 2-digit program and 2-digit element into a 4-digit code for readability.  

---

**4. Subprogram Codes (7 digits)**  
- **Definition:** For capital outlay projects, subprograms use a 7-digit code derived from the first seven digits of the 10-digit program code (`Program-Element-Component`). Additional breakdown of a specific activity. 
- **Example:** `9801000` = Capital outlay project under Program `98`, Element `01`, Component `000`.  
- **Source:**  
  - **DOF Capital Outlay Coding Structure** https://dof.ca.gov/accounting/accounting-policies-and-procedures/department-program-codes/  

---

**5. Fund Code (4 digits)**  
- **Definition:** Identifies the funding source (e.g., General Fund, special funds).  
- **Example:** `0044` = Motor Vehicle Fuel Account.  
- **Source:**  
  - **Uniform Codes Manual**  https://dof.ca.gov/wp-content/uploads/sites/352/Accounting/Policies_and_Procedures/Uniform_Codes_Manual/18fndsrc.pdf 

---

**6. Reference Code (3 digits)**  
- **Definition:** Part of the 11-digit appropriation code, indicating the type of appropriation (e.g., support, local assistance).  
- **Example:** `001` = Budget Act Item – Support.  
- **Source:**  
  - **Budget Act Coding Scheme** https://dof.ca.gov/budget/budget-act/  

---

**7. Grant**: A grant is a financial award provided by a government agency to an eligible recipient (such as nonprofits, local governments, or other organizations) to support activities or projects that align with the objectives of a specific program.

Program or grant names are commonly used but are not always consistent or unique across all datasets and departments.

**8. Portal ID**: For cross-referencing grants and programs across multiple datasets and departments, the Portal ID (for grants) and Department Program Code/Project Code (for budget and accounting) are the most reliable keys, but their use depends on the source system and the level of detail provided in public data. The Portal ID on grants.ca.gov is the canonical, unique identifier for grants listed on the California Grants Portal and in its datasets. https://www.grants.ca.gov/glossary/


### **Summary Table**

| Code Type               | Digits | Example   | Source/Definition                                                                 |
|-------------------------|--------|-----------|-----------------------------------------------------------------------------------|
| Organization/Business Unit | 4    | `0280`    | Uniform Codes Manual https://www.dgs.ca.gov/Resources/SAM/TOC/7100/7131  ,  https://dof.ca.gov/wp-content/uploads/sites/352/Accounting/Policies_and_Procedures/Uniform_Codes_Manual/18fndsrc.pdf                                                   |
| Program (DOF Internal)  | 2      | `98`      | DOF Program Coding Structure https://dof.ca.gov/accounting/accounting-policies-and-procedures/department-program-codes/                                                |
| Program + Element (ebudget) | 4  | `9801`    | Aggregated display of 2-digit program + 2-digit element https://dof.ca.gov/accounting/accounting-policies-and-procedures/department-program-codes/, https://dof.ca.gov/budget/budget-act/                 |
| Subprogram (Capital Outlay) | 7  | `9801000` | DOF Capital Outlay Coding Structure https://dof.ca.gov/accounting/accounting-policies-and-procedures/department-program-codes/                                         |
| Fund                    | 4      | `0044`    | Uniform Codes Manual  https://dof.ca.gov/wp-content/uploads/sites/352/Accounting/Policies_and_Procedures/Uniform_Codes_Manual/18fndsrc.pdf                                                        |
| Reference               | 3      | `001`     | Budget Act Coding Scheme https://dof.ca.gov/budget/budget-act/                                                    |

---

**Program and Department with the same name**: The state’s budgeting and accounting systems require both an organization code (to identify the department/entity) and a program code (to identify the function or activity), even if there is only one program within a department. For small or single-purpose departments, the department and its primary program often have the same or similar names, because the department essentially exists to run that one program.

#### State Controller Office

State Controller’s Office (SCO) Entity Codes. Used for payroll, compensation, and certain public reporting systems. These codes are unique to the SCO’s internal and public reporting needs and do not always correspond directly to DOF organization codes.

Other than being the number published in the CSV salary download files, this code does not appear to be published anywhere publicly.  

| Entity  |
| - |
| XXXX      |

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
- **budget_organizationalCode**: The California Department of Finance budget organizationalCode (when applicable)
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
  - Includes metadata like budget organizationalCodes and key functions

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
     - organizational codes
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
