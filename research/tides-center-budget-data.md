# Tides Center - California State Budget & Spending Data Research

## Summary

Research into California state budget data related to the **Tides Center** (EIN: 94-3213100), a San Francisco-based fiscal sponsorship nonprofit. This document compiles findings from public records, investigative reporting, and government transparency portals.

## Key Finding: ~$18 Million in California State Payments (2019-2024)

According to a Washington Free Beacon review of California's state spending database (Open FI$Cal), California has sent nearly **$18 million** in taxpayer funding to the Tides Center since Governor Newsom took office in 2019. The payments came from **18 state agencies**.

State officials noted the spending database is **missing information from some departments**, meaning total payments could exceed the $18 million figure.

## California State Agency Payment Breakdown

| Agency / Department | Amount | Period | Known End Recipient |
|---|---|---|---|
| Department of Health Care Services | $8,800,000 | 2019-2024 | Unknown (records request pending) |
| Department of Public Health | $3,400,000 | 2019-2024 | Therapeutic COVID-19 response programs |
| Coastal Commission | $500,000+ | 2019-2024 | Unknown |
| CA Air Resources Board (CARB) | $100,000 | — | Hope Collaborative (Oakland) via "community air grant" |
| CA Environmental Protection Agency | $95,000 | — | Orange County Environmental Justice Fund (2 grants) |
| CA State Library | $70,000 | 2022-2024 | National Veterans Network (Japanese-American WWII education) |
| Department of Industrial Relations | Part of $4M group | — | Disclosed but amount unspecified |
| Employment Development Department | Part of $4M group | — | Disclosed but amount unspecified |
| CA Workforce Investment Board | Part of $4M group | — | Disclosed but amount unspecified |
| 9 additional agencies | < $500K each | 2019-2024 | Unknown / not disclosed |

**Note:** Only 6 of the 18 agencies disclosed which Tides Center project ultimately received state funding. Those 6 agencies provided ~$4 million combined (22% of total). The remaining 12 agencies either couldn't find records, asked for more time, or didn't respond.

## Tides Center Organization Profile

- **Legal Name:** The Tides Center, Inc.
- **EIN:** 94-3213100
- **Location:** San Francisco, CA (Presidio)
- **Type:** 501(c)(3) Public Charity
- **NTEE Code:** W02 (Management & Technical Assistance)
- **Total Assets (2022):** $431,562,198
- **Total Assets (2023):** $323,415,754

## Financial Summary (from IRS Form 990)

| Fiscal Year | Revenue | Expenses | Total Assets |
|---|---|---|---|
| 2023 | $233,730,257 | $307,289,944 | $323,415,754 |
| 2022 | $281,474,772 | $415,897,054 | $431,562,198 |

## Federal Government Funding

| Source | Period | Amount |
|---|---|---|
| USASpending.gov (official) | 2008-2020 | $34.1 million |
| Tides Center 990 filings (actual) | 2001-2018 | ~$170 million |
| USAID | 2008-2020 | $18.47 million |
| HHS | 2008-2020 | $12.57 million |
| State Dept + USAID combined | 2014-2022 | $27 million |
| Department of Labor | — | $3 million |
| All federal (FY 2024) | 2024 | $37,810,397 |

**Note:** USASpending.gov data is incomplete — during the same period it shows $34M, Tides Center's own tax forms show $139M in government grants.

## Government Grant Growth Over Time

| Year | Government Grants (from 990s) |
|---|---|
| 2001 | $3,400,000 |
| 2014 | $13,030,345 |
| 2018 | $19,200,000 |
| 2024 | $37,810,397 |

## Fiscal Sponsorship Structure

The Tides Center operates as a fiscal sponsor — it provides 501(c)(3) tax-exempt status to organizations (called "fiscal sponsorships" or "projects") that either cannot or prefer not to apply for their own charitable status. As of March 2025, Tides Center controls **78 fiscally sponsored groups**.

### Cost Allocation for Fiscal Sponsorship
- Standard: **9%** of a project's gross annual revenue
- Projects with revenue > $1M: **6%**
- Government-sourced funding: **15%** (higher due to auditing/reporting requirements)

## The Tides Nexus (Related Entities)

| Entity | Role |
|---|---|
| Tides Center | Fiscal sponsorship / project incubation |
| Tides Foundation | Grantmaking / donor-advised funds |
| Tides Advocacy | Lobbying / 501(c)(4) advocacy |
| Tides Network | Shared services / management |
| Tides Inc. | Corporate operations |
| Tides Two Rivers Fund | Investment vehicle |

## Data Sources

### Primary
- **California Open FI$Cal** (open.fiscal.ca.gov) — State spending transparency portal with vendor transaction data from 151 departments
- **IRS Form 990 filings** via ProPublica Nonprofit Explorer
- **USASpending.gov** — Federal grant tracking

### Investigative Reporting
- Washington Free Beacon (April 2, 2025): "Newsom's California Has Sent Nearly $18 Million in Taxpayer Funds to Soros-Backed Tides Center"
- Washington Free Beacon: "Tides Center Funnels $170 Million in Taxpayer Money to Left-Wing Groups"
- Americans for Public Trust analysis

## How to Query This Data in Cali DOGE

The Tides Center should appear in the Cali DOGE database as a vendor. To search:

### Via Search API
```
GET /api/search?q=tides+center&types=vendor&limit=50
```

### Via Spend API (vendor view)
```
GET /api/spend?vendor=tides+center&view=vendor
```

### Via Spend API (by department)
```
# Department of Health Care Services (code: 4260)
GET /api/spend?department_code=4260&vendor=tides+center&view=vendor

# Department of Public Health (code: 4265)
GET /api/spend?department_code=4265&vendor=tides+center&view=vendor
```

### Direct Supabase Query
```sql
-- Search for Tides Center in vendor transactions
SELECT
  v.name AS vendor_name,
  vt.department_code,
  vt.fiscal_year,
  SUM(vt.amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM vendor_transactions vt
JOIN vendors v ON vt.vendor_id = v.id
WHERE v.name ILIKE '%tides center%'
   OR v.name ILIKE '%tides%center%'
GROUP BY v.name, vt.department_code, vt.fiscal_year
ORDER BY vt.fiscal_year DESC, total_amount DESC;
```

## Known California Department Codes (for cross-reference)

| Department | Code | Known Tides Center Payments |
|---|---|---|
| Department of Health Care Services | 4260 | $8.8M |
| Department of Public Health | 4265 | $3.4M |
| California Coastal Commission | 3720 | $500K+ |
| Air Resources Board (CARB) | 3900 | $100K |
| Environmental Protection Agency | 0555 | $95K |
| California State Library | 6120 | $70K |
| Department of Industrial Relations | 7350 | Undisclosed |
| Employment Development Department | 7100 | Undisclosed |

## Gaps & Next Steps

1. **Database Verification**: Query the Supabase database for "Tides Center" as a vendor to verify what transaction data exists in the Cali DOGE dataset
2. **EIN Cross-Reference**: Use EIN 94-3213100 to match vendor records (the `vendors` table has an `ein` field)
3. **Year-by-Year Breakdown**: Once vendor is identified, query each fiscal year partition (2016-2024) for transaction details
4. **Related Entity Search**: Also search for "Tides Foundation" (EIN: 51-0198509) and "Tides Advocacy" (EIN: 94-3153687) for complete picture
5. **Open FI$Cal Download**: Download vendor transaction CSVs from open.fiscal.ca.gov and filter for Tides entities for raw data validation
