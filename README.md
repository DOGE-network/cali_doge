# cali_doge
I am the love child of Elon Musk and Lanhee Chen. Godson of David Sacks. A fun mode parody account for educational purposes.

## Fiscal Year Representation

The website uses fiscal year data for budget and workforce information. Understanding how fiscal years are represented is important for interpreting the data correctly.

### California Fiscal Year Convention

In California state government:

- A fiscal year spans from July 1 to June 30 of the following calendar year
- Official state documents represent fiscal years as "YYYY-YY" (e.g., "2023-24")
- This indicates the fiscal year begins on July 1, 2023 and ends on June 30, 2024

### Fiscal Year Representation in Our Data

For simplicity and consistency across our application:

1. **Single Year Format**: We use a single year format (e.g., "2023" instead of "2023-24") in our JSON data files
2. **First Year Convention**: The year we use represents the first year of the fiscal year range
   - Example: "2023" in our data represents the fiscal year "2023-24" (July 1, 2023 to June 30, 2024)

3. **Display Format**: 
   - In data tables, we display just the year number (e.g., "2023")
   - This represents the full fiscal year that begins in that calendar year

### Implementation in Data Files

This convention is applied consistently across our data sources:

- **Spending Data** (`src/data/spending-data.json`): Uses "FY" prefix followed by year (e.g., "FY2023")
- **Workforce Data** (`src/data/workforce-data.json`): Uses year only (e.g., "2023")

When interpreting the data, remember that each year represents the beginning of a fiscal year period that extends into the following calendar year.

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
     slug: '3900_air_resources_board',  // Format: <dept_code>_<name_in_snake_case>
     fullName: 'Air Resources Board',  // Official name
     spendingName: 'Air Resources Board',  // Optional: only if different from fullName
     workforceName: 'Air Resources Board'  // Optional: only if different from fullName
   }
   ```

2. **Create the Department Page**:
   Create a new markdown file at `src/app/departments/posts/<dept_code>_<name_in_snake_case>.md` using the same format as the slug.
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

- Example data 
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