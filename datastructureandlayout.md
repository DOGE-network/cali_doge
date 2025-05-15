# Data Processing Pipeline

1. **Data Collection**:
   - src/scripts/download_publicpay_csv.js Workforce CSV from publicpay.ca.gov
   - src/scripts/download_budgets.sh Budget PDF from ebudget.ca.gov
   - src/scripts/download_vendor_transactions.js vendor CSV from fiscal.ca.gov

2. **Data Processing**:
   - src/scripts/extract_pdf_text.py extract text from budget PDF files
   - src/scripts/process_vendors.ts process vendor CSV for vendor json records
   - src/scripts/process_department_spending.js process budget text for fund, program, and department json records
   - src/scripts/process_department_salary.js process salary CSV for department json record salary and headcount fields
   - markdown files are created by AI prompt using the budget text files using 2015 - 2025 fiscal years

3. data sources:
- ebudget for department, fund, and program json
- fiscal for vendor json

# planned changes

1. search:
- searchable fields: department name, orgCode, vendor name, EIN, program name, projectCode, program description

2. department specific markdown page:
- spend section: from json sources, fiscal year, vendor name, program name, fund name, total amount spend
- workforce section: points to workforce page display for department 
- custom text on the department
- sources

3.  spend page:
- display json data as a list with sortable columns
- filter data by fiscal year, department name, vendor name, program name, fund name, total amount spend

4. update departments.json. interface Department {
departments[
organizationCode, departmentName[
fiscalYear[
programSpendType[
projectCode[
fundCode, budgetAmount]]]]]

5. create programs.json and type file
programs[
projectCode, programName[
description, source]]

6. create funds.json and type file
funds[
fundCode, fundName]

7. update vendors.json[
vendors[
ein, vendorName[
fiscalYear[
projectCode[
organizationCode, count, amount]]]]]

8. update process department spending script code, logging, and header comments
- each budget txt file has multiple departmement sections followed by program descriptions and DETAILED EXPENDITURES BY PROGRAM  subsections. e.g. department (many program descriptions then many detailed expenditures by the same programs)
- log all output, input, writes, reads, errors and actions
- section: for each with 4 digit org code and department name on a line followed by department description as paragraphs, and then followed by "3-YR EXPENDITURES AND POSITIONS"
- match 4 digit org code and department name to a single record in departments.json using src/lib/departmentMatching.js. if multiple record organizationalCode matches or not an exact record name match, prompt the user which record to use for the text and to verify continue
- if match then update the record org code, add the department name to aliases, and or update department description.
- subsection one: then match "PROGRAM DESCRIPTIONS"
- for each program description match, there will be many programs and program components
- each program has 4 digit code "-" program name and may be followed by program description with multiple paragraphs
- there may be 0 or more program component with 7 digit code "-" program component name followed by program component description with multiple paragraphs.
- ignore lines with 4 digit org code, department name and "- Continued" and other header, footer text
- for each match 4 or 7 digit code and name to a single record in programs.json using src/lib/departmentMatching.js. if multiple record code matches or not an exact record name match, prompt the user which record to use for the text and to verify continue. If not match then create new program record. 
- subsection two: then match "DETAILED EXPENDITURES BY PROGRAM", then 3 groups of fiscal years, and then "PROGRAM REQUIREMENTS"
- for each program above, there will be a matching entry. 
- entries are grouped by fundingType "State Operations:" and or "Local Assistance:"
- followed by one or more 4 digit fund code, fund name, and the amounts for each of the above fiscal years. 
- ignore lines with 4 digit org code, department name and "- Continued" and other header, footer text
- if the program has one or more program components, then there will be one or more "SUBPROGRAM REQUIREMENTS". these entities will match the "PROGRAM REQUIREMENTS" fund codes and names, while the amounts will be fractions of the total program amounts. 
- also show diff of departments.json department record array program with fiscalYear array, organizational code, programfundingType, fundCode and amount. 
-  Verify this and log, display for the user to approve. 
- if approve then update departments, program, and fund json 

9. Search json
- create during project build
- example {
  "departments": [
    { "term": "Judicial Performance", "type": "department", "id": "0280" }
  ],
  "vendors": [
    { "term": "Acme Corp", "type": "vendor", "id": "94-1234567" }
  ],
  "programs": [
    { "term": "Oversight", "type": "program", "id": "8363-980" }
  ]
}
