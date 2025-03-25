#!/bin/bash

# California State Government Budget Document Downloader

// known problem that the state controller does not put many documents in this easy to use location
// we will need to use browser automation to download the documents from the state controller website

# Define target directories
TARGET_DIR="./src/data/budget_docs"
LOG_DIR="./src/logs"

# Create directories if they don't exist
mkdir -p "$TARGET_DIR"
mkdir -p "$LOG_DIR"

# Check if target directory exists and is writable
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Target directory $TARGET_DIR does not exist or could not be created."
  exit 1
fi

if [ ! -w "$TARGET_DIR" ]; then
  echo "Error: Target directory $TARGET_DIR is not writable."
  exit 1
fi

# Find the most recent log file
last_log=$(ls -t "$LOG_DIR"/budget_download_*.log 2>/dev/null | head -1)

# Initialize variables to track the last processed department and fiscal year
last_dept=""
last_fiscal_year=""
resume_processing=false
last_position=""
resume_next_dept=false

# Counter for download attempts
attempt_counter=0

# If a previous log exists, find the last processed item (success or failure)
if [ -n "$last_log" ]; then
  echo "Found previous log file: $last_log"
  
  # Check if the previous run completed successfully
  if grep -q "Download process completed" "$last_log"; then
    echo "Previous download process completed successfully. Starting fresh."
  else
    echo "Previous download process did not complete. Attempting to resume."
    
    # Get the last processed item (success or failure)
    last_processed=$(grep -E "SUCCESS:|FAILURE:" "$last_log" | tail -1)
    
    if [ -n "$last_processed" ]; then
      # Extract department code and fiscal year from the log message
      if [[ "$last_processed" == *"SUCCESS:"* ]]; then
        last_position="SUCCESS"
        last_dept=$(echo "$last_processed" | sed -E 's/.*Downloaded ([0-9]{4}) - FY.*/\1/')
        last_fiscal_year=$(echo "$last_processed" | sed -E 's/.*FY ([0-9]{4}-[0-9]{2}).*/\1/')
      else
        last_position="FAILURE"
        last_dept=$(echo "$last_processed" | sed -E 's/.*valid PDF for ([0-9]{4}) - FY.*/\1/')
        last_fiscal_year=$(echo "$last_processed" | sed -E 's/.*FY ([0-9]{4}-[0-9]{2}).*/\1/')
      fi
      
      echo "Resuming from $last_position: department $last_dept, fiscal year $last_fiscal_year"
      resume_processing=true
    else
      echo "No processed items found in previous log. Starting fresh."
    fi
  fi
fi

# Create a new log file
log_file="$LOG_DIR/budget_download_$(date +%Y%m%d_%H%M%S).log"
echo "Budget document download started at $(date)" > "$log_file"
echo "Target directory: $TARGET_DIR" >> "$log_file"

if [ "$resume_processing" = true ]; then
  echo "Resuming from previous run ($last_position: department $last_dept, fiscal year $last_fiscal_year)" >> "$log_file"
fi

# Comprehensive list of fiscal years in format YYYY-YY
declare -a fiscal_years=(
  "2017-18"
  "2018-19"
  "2019-20"
  "2020-21"
  "2021-22"
  "2022-23"
  "2023-24"
  "2024-25"
)

# Current fiscal year (for determining document type)
current_fiscal_year="2024-25"

# Document types array
declare -a doc_types=(
  "GovernorsBudget"  # For current year proposed budget
  "Enacted"          # For previous years enacted budget
)

# Complete list of agency codes (Level A) from the CSV data - CORRECTED
declare -a agency_codes=(
  "0010 Legislative, Judicial, and Executive"
  "0200 Judicial"
  "0500 Executive"
  "1000 Business, Consumer Services, and Housing"
  "2050 Business, Transportation, and Housing Agency Programs"
  "2500 Transportation"
  "3000 Natural Resources"
  "3890 Environmental Protection"
  "4000 Health and Human Services"
  "5210 Corrections and Rehabilitation"
  "6000 Education"
  "6010 K-12 Education"
  "6013 Higher Education"
  "7000 Labor and Workforce Development"
  "7500 Government Operations"
  "8000 General Government"
)

# Complete list of department codes (Level 1) from the CSV data
declare -a department_codes=(
  "0100 Legislature"
  "0250 Judicial Branch"
  "0500 Governor's Office"
  "0509 Governor's Office of Business and Economic Development"
  "0511 Secretary for Government Operations Agency"
  "0515 Secretary for Business, Consumer Services, and Housing Agency"
  "0521 Secretary for Transportation Agency"
  "0530 Secretary for California Health and Human Services Agency"
  "0540 Secretary of the Natural Resources Agency"
  "0555 Secretary for Environmental Protection"
  "0559 Secretary for Labor and Workforce Development Agency"
  "0650 Office of Planning and Research"
  "0690 Office of Emergency Services"
  "0750 Office of the Lieutenant Governor"
  "0820 Department of Justice"
  "0840 State Controller"
  "0845 Department of Insurance"
  "0890 Secretary of State"
  "0950 State Treasurer"
  "1110 Department of Consumer Affairs"
  "1111 Department of Consumer Affairs, Boards"
  "1700 Department of Fair Employment and Housing"
  "1701 Business, Consumer Services, and Housing Operations"
  "1750 Horse Racing Board"
  "1800 Department of Financial Protection and Innovation"
  "2100 Department of Alcoholic Beverage Control"
  "2120 Alcoholic Beverage Control Appeals Board"
  "2240 Department of Housing and Community Development"
  "2320 Department of Real Estate"
  "2600 California Transportation Commission"
  "2660 Department of Transportation"
  "2665 High-Speed Rail Authority"
  "2670 Board of Pilot Commissioners"
  "2700 Office of Traffic Safety"
  "2720 Department of the California Highway Patrol"
  "2740 Department of Motor Vehicles"
  "3100 California Science Center"
  "3125 California Tahoe Conservancy"
  "3340 California Conservation Corps"
  "3360 Energy Resources Conservation and Development Commission"
  "3460 Colorado River Board of California"
  "3480 Department of Conservation"
  "3540 Department of Forestry and Fire Protection"
  "3560 State Lands Commission"
  "3600 Department of Fish and Wildlife"
  "3640 Wildlife Conservation Board"
  "3720 California Coastal Commission"
  "3760 State Coastal Conservancy"
  "3780 Native American Heritage Commission"
  "3790 Department of Parks and Recreation"
  "3810 Santa Monica Mountains Conservancy"
  "3820 San Francisco Bay Conservation and Development Commission"
  "3825 San Gabriel and Lower Los Angeles Rivers and Mountains Conservancy"
  "3830 San Joaquin River Conservancy"
  "3835 Baldwin Hills Conservancy"
  "3840 Delta Protection Commission"
  "3845 San Diego River Conservancy"
  "3850 Coachella Valley Mountains Conservancy"
  "3855 Sierra Nevada Conservancy"
  "3860 Department of Water Resources"
  "3875 Sacramento-San Joaquin Delta Conservancy"
  "3900 Air Resources Board"
  "3930 Department of Pesticide Regulation"
  "3940 State Water Resources Control Board"
  "3960 Department of Toxic Substances Control"
  "3970 Department of Resources Recycling and Recovery"
  "3980 Office of Environmental Health Hazard Assessment"
  "4100 State Council on Developmental Disabilities"
  "4120 Emergency Medical Services Authority"
  "4140 Office of Statewide Health Planning and Development"
  "4150 Department of Managed Health Care"
  "4170 Department of Aging"
  "4180 Commission on Aging"
  "4185 California Senior Legislature"
  "4260 Department of Health Care Services"
  "4265 Department of Public Health"
  "4300 Department of Developmental Services"
  "4440 Department of State Hospitals"
  "4560 Mental Health Services Oversight and Accountability Commission"
  "4700 Department of Community Services and Development"
  "4800 California Health Benefit Exchange"
  "5160 Department of Rehabilitation"
  "5175 Department of Child Support Services"
  "5180 Department of Social Services"
  "5195 State Independent Living Council"
  "5225 Department of Corrections and Rehabilitation"
  "5227 Board of State and Community Corrections"
  "6100 Department of Education"
  "6120 California State Library"
  "6125 Education Audit Appeals Panel"
  "6255 California State Summer School for the Arts"
  "6360 Commission on Teacher Credentialing"
  "6440 University of California"
  "6600 Hastings College of the Law"
  "6610 California State University"
  "6870 Board of Governors of the California Community Colleges"
  "6980 California Student Aid Commission"
  "7100 Employment Development Department"
  "7120 California Workforce Development Board"
  "7300 Agricultural Labor Relations Board"
  "7320 Public Employment Relations Board"
  "7350 Department of Industrial Relations"
  "7501 Department of Human Resources"
  "7502 Department of Technology"
  "7503 State Personnel Board"
  "7600 California Department of Tax and Fee Administration"
  "7730 Franchise Tax Board"
  "7760 Department of General Services"
  "7870 California Victim Compensation Board"
  "7900 Public Employees' Retirement System"
  "7910 Office of Administrative Law"
  "7920 State Teachers' Retirement System"
  "8010 Non-Agency Departments"
  "8260 California Arts Council"
  "8570 Department of Food and Agriculture"
  "8620 Fair Political Practices Commission"
  "8640 Political Reform Act of 1974"
  "8660 Public Utilities Commission"
  "8780 Milton Marks Little Hoover Commission on California State Government Organization and Economy"
  "8820 Commission on the Status of Women and Girls"
  "8830 California Law Revision Commission"
  "8855 California State Auditor's Office"
  "8860 Department of Finance"
  "8940 Military Department"
  "8955 Department of Veterans Affairs"
  "9100 Tax Relief"
  "9210 Local Government Financing"
  "9600 Debt Service for General Obligation Bonds"
  "9620 Interest Payments to the Federal Government"
  "9625 Interest Payments to Loans from Special Fund for Economic Uncertainties"
  "9650 Health and Dental Benefits for Annuitants"
  "9670 Equity Claims of California Victim Compensation Board and Settlements and Judgments by Department of Justice"
  "9800 Augmentation for Employee Compensation"
  "9900 Statewide General Administrative Expenditures"
)

# Function to validate if a file is a valid PDF and not an error page
validate_pdf() {
  local file="$1"
  
  # Check if file exists and has content
  if [ ! -s "$file" ]; then
    return 1
  fi
  
  # Check if file is a PDF (starts with %PDF)
  if ! head -c 4 "$file" | grep -q "%PDF"; then
    return 1
  fi
  
  return 0
}

# Function to pause for a random duration between 10-30 seconds
random_pause() {
  local min_seconds=10
  local max_seconds=30
  local pause_duration=$((RANDOM % (max_seconds - min_seconds + 1) + min_seconds))
  
  echo "Pausing for $pause_duration seconds to avoid rate limiting..." | tee -a "$log_file"
  sleep $pause_duration
  echo "Resuming downloads..." | tee -a "$log_file"
}

# Download files
echo "Starting downloads..." | tee -a "$log_file"
success_count=0
failure_count=0
skipped_count=0

# Flag to indicate if we should start processing
start_processing=false
if [ "$resume_processing" = false ]; then
  start_processing=true
fi

# Check if the last department is in our list
if [ "$resume_processing" = true ]; then
  dept_found=false
  for dept_info in "${department_codes[@]}"; do
    dept_code=$(echo "$dept_info" | awk '{print $1}')
    if [ "$dept_code" = "$last_dept" ]; then
      dept_found=true
      break
    fi
  done
  
  if [ "$dept_found" = false ]; then
    echo "Last department $last_dept not found in department list. Will resume with next department." | tee -a "$log_file"
    # Find the next department after the last one
    resume_next_dept=true
    start_processing=false
  fi
fi

for dept_info in "${department_codes[@]}"; do
  # Extract the 4-digit code (without comments)
  dept_code=$(echo "$dept_info" | awk '{print $1}')
  
  # If resuming and the last department wasn't found, find the next one
  if [ "$resume_next_dept" = true ]; then
    if [ "$dept_code" -gt "$last_dept" ]; then
      echo "Resuming with next department: $dept_code" | tee -a "$log_file"
      start_processing=true
      resume_next_dept=false
    else
      echo "Skipping department: $dept_code (before next department)" | tee -a "$log_file"
      skipped_count=$((skipped_count + 1))
      continue
    fi
  # If resuming normally, skip until we reach the last processed department
  elif [ "$resume_processing" = true ] && [ "$start_processing" = false ]; then
    if [ "$dept_code" = "$last_dept" ]; then
      start_processing=true
    else
      echo "Skipping department: $dept_code (before last processed)" | tee -a "$log_file"
      skipped_count=$((skipped_count + 1))
      continue
    fi
  fi
  
  for fiscal_year in "${fiscal_years[@]}"; do
    # If resuming and we're at the last department, skip until we reach the last fiscal year
    if [ "$resume_processing" = true ] && [ "$dept_code" = "$last_dept" ] && [ "$start_processing" = true ]; then
      # Convert fiscal years to comparable format (first year only)
      current_first_year=$(echo "$fiscal_year" | cut -d'-' -f1)
      last_first_year=$(echo "$last_fiscal_year" | cut -d'-' -f1)
      
      if [ "$current_first_year" -lt "$last_first_year" ]; then
        echo "Skipping already processed: $dept_code - FY $fiscal_year" | tee -a "$log_file"
        skipped_count=$((skipped_count + 1))
        continue
      elif [ "$current_first_year" -eq "$last_first_year" ] && [ "$last_position" = "SUCCESS" ]; then
        echo "Skipping already processed: $dept_code - FY $fiscal_year" | tee -a "$log_file"
        skipped_count=$((skipped_count + 1))
        continue
      fi
    fi
    
    # Extract the first year from the fiscal year string for the output filename
    first_year=$(echo "$fiscal_year" | cut -d'-' -f1)
    
    # Determine document type based on fiscal year
    if [ "$fiscal_year" = "$current_fiscal_year" ]; then
      doc_type="GovernorsBudget"  # Current year uses proposed budget
    else
      doc_type="Enacted"  # Previous years use enacted budget
    fi
    
    # Find the appropriate agency code for this department
    # This is based on the organizational structure where departments are under agencies
    agency_code=""
    for potential_agency in "${agency_codes[@]}"; do
      potential_agency_code=$(echo "$potential_agency" | awk '{print $1}')
      # If the department code starts with the same first digit as the agency code
      # or if the department is in a specific agency based on the organizational structure
      if [[ "${dept_code:0:1}" == "${potential_agency_code:0:1}" ]]; then
        agency_code="$potential_agency_code"
        break
      fi
    done
    
    # If no agency code was found, use the default 0010 (Legislative, Judicial, Executive)
    if [ -z "$agency_code" ]; then
      agency_code="0010"
    fi
    
    # Skip departments marked with "DO NOT USE"
    if [[ "$dept_info" == *"DO NOT USE"* ]]; then
      echo "SKIPPING: ${dept_code} - marked as DO NOT USE" | tee -a "$log_file"
      continue
    fi
    
    # Construct output filename - format: departmentcode_firstyearoffiscalyear_budget.pdf
    output_file="${TARGET_DIR}/${dept_code}_${first_year}_budget.pdf"
    
    # Check if the file already exists and is valid
    if [ -f "$output_file" ] && validate_pdf "$output_file"; then
      echo "SKIPPING: ${dept_code} - FY ${fiscal_year} (already exists)" | tee -a "$log_file"
      skipped_count=$((skipped_count + 1))
      continue
    fi
    
    # URL follows pattern: ebudget.ca.gov/[FISCAL-YEAR]/pdf/[DOCUMENT-TYPE]/[AGENCY-CODE]/[DEPARTMENT-CODE].pdf
    url="https://ebudget.ca.gov/${fiscal_year}/pdf/${doc_type}/${agency_code}/${dept_code}.pdf"
    
    echo "Attempting to download: $url" | tee -a "$log_file"
    
    # Increment the attempt counter
    attempt_counter=$((attempt_counter + 1))
    
    # Check if we need to pause (every 150 attempts)
    if [ $((attempt_counter % 150)) -eq 0 ]; then
      random_pause
    fi
    
    # Download the file to a temporary location first
    temp_file=$(mktemp)
    curl -L -s -o "$temp_file" "$url"
    
    # Validate if the downloaded file is a valid PDF
    if validate_pdf "$temp_file"; then
      # If valid, move to the final destination
      mv "$temp_file" "$output_file"
      echo "SUCCESS: Downloaded ${dept_code} - FY ${fiscal_year} to $output_file" | tee -a "$log_file"
      success_count=$((success_count + 1))
    else
      # If not valid, log the failure and remove the temporary file
      echo "FAILURE: Could not download valid PDF for ${dept_code} - FY ${fiscal_year}" | tee -a "$log_file"
      rm -f "$temp_file"
      failure_count=$((failure_count + 1))
    fi
    
    # Add a small delay to be nice to the server
    sleep 2
  done
done

echo "Download process completed." | tee -a "$log_file"
echo "Successful downloads: $success_count" | tee -a "$log_file"
echo "Failed downloads: $failure_count" | tee -a "$log_file"
echo "Skipped downloads: $skipped_count" | tee -a "$log_file"
echo "See $log_file for details." 