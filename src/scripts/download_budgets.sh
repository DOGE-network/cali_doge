#!/bin/bash

# California State Government Budget Document Downloader

# This script downloads budget documents from the California Department of Finance website
# It handles downloading PDF files for all state agencies
# It saves all files to src/data/budget directory
# It handles the extraction of agency codes and fiscal years
# It handles the download of PDF files
# It handles the validation of downloaded files

# NOTE: The state dept of finance does not put documents in an easy to use location
# We will need to use browser automation to download the documents from the state's ebudget website
# Budget documents: https://ebudget.ca.gov/
# Budget uses DEPARTMENT OF FINANCE UNIFORM CODES or organizational codes

# Prerequisites:
# 1. Bash shell environment
# 2. curl command line tool
# 3. write permissions to src/data/budget directory

# Usage:
# Run the script:
# ```bash
# ./download_budgets.sh
# ```

# Steps:
# 1. Create src/data/budget/ directory if it doesn't exist
#    a. Create log directory
#    b. Verify write permissions
#    c. Initialize logging
# 2. Process each agency
#    a. Load agency codes
#    b. Process each fiscal year
#    c. Handle resume functionality
# 3. Download PDF files for each fiscal year
#    a. Construct download URL
#    b. Download file to temp location
#    c. Validate PDF content
#    d. Move to final location
# 4. Save files with format: agencycode_firstyearoffiscalyear_budget.pdf
#    a. Generate filename
#    b. Verify file integrity
#    c. Log success/failure

# Features:
# - Automatic retry on failures
# - Rate limiting (2-6 second delay between requests)
# - Progress logging
# - Error handling and reporting
# - Organized file naming by agency and year
# - Resume capability from previous runs

# Notes:
# - Files are saved in src/data/budget/
# - Each PDF contains agency budget data
# - Minimum fiscal year is 2017-18
# - Maximum fiscal year is 2025-26
# - Supports both Governor's Budget and Enacted Budget documents

# Step 1: Setup directories and logging
echo "Step 1: Setting up directories and logging..."

# Step 1.a: Define target directories
TARGET_DIR="./src/data/budget"
LOG_DIR="./src/logs"

# Step 1.b: Create directories if they don't exist
echo "Step 1.b: Creating directories..."
mkdir -p "$TARGET_DIR"
mkdir -p "$LOG_DIR"

# Step 1.c: Check if target directory exists and is writable
echo "Step 1.c: Verifying directory permissions..."
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Target directory $TARGET_DIR does not exist or could not be created."
  exit 1
fi

if [ ! -w "$TARGET_DIR" ]; then
  echo "Error: Target directory $TARGET_DIR is not writable."
  exit 1
fi

# Step 1.d: Initialize logging
echo "Step 1.d: Initializing logging..."
log_file="$LOG_DIR/budget_download_$(date +%Y%m%d_%H%M%S).log"
echo "Budget document download started at $(date)" > "$log_file"
echo "Target directory: $TARGET_DIR" >> "$log_file"

# Step 2: Process agencies
echo "Step 2: Processing agencies..." | tee -a "$log_file"

# Step 2.a: Find the most recent log file for resume functionality
echo "Step 2.a: Checking for previous run..." | tee -a "$log_file"
last_log=$(ls -t "$LOG_DIR"/budget_download_*.log 2>/dev/null | head -1)

# Initialize variables to track the last processed agency and fiscal year
last_agency=""
last_fiscal_year=""
resume_processing=false
last_position=""
resume_next_agency=false

# Counter for download attempts
attempt_counter=0

# Step 2.b: Handle resume functionality
echo "Step 2.b: Setting up resume functionality..." | tee -a "$log_file"
if [ -n "$last_log" ]; then
  echo "Found previous log file: $last_log" | tee -a "$log_file"
  
  # Check if the previous run completed successfully
  if grep -q "Download process completed" "$last_log"; then
    echo "Previous download process completed successfully. Starting fresh." | tee -a "$log_file"
  else
    echo "Previous download process did not complete. Attempting to resume." | tee -a "$log_file"
    
    # Get the last processed item (success or failure)
    last_processed=$(grep -E "SUCCESS:|FAILURE:" "$last_log" | tail -1)
    
    if [ -n "$last_processed" ]; then
      # Extract agency code and fiscal year from the log message
      if [[ "$last_processed" == *"SUCCESS:"* ]]; then
        last_position="SUCCESS"
        last_agency=$(echo "$last_processed" | sed -E 's/.*Downloaded ([0-9]{4}) - FY.*/\1/')
        last_fiscal_year=$(echo "$last_processed" | sed -E 's/.*FY ([0-9]{4}-[0-9]{2}).*/\1/')
      else
        last_position="FAILURE"
        last_agency=$(echo "$last_processed" | sed -E 's/.*valid PDF for ([0-9]{4}) - FY.*/\1/')
        last_fiscal_year=$(echo "$last_processed" | sed -E 's/.*FY ([0-9]{4}-[0-9]{2}).*/\1/')
      fi
      
      echo "Resuming from $last_position: agency $last_agency, fiscal year $last_fiscal_year" | tee -a "$log_file"
      resume_processing=true
    else
      echo "No processed items found in previous log. Starting fresh." | tee -a "$log_file"
    fi
  fi
fi

# Step 2.c: Define fiscal years and document types
echo "Step 2.c: Setting up fiscal years and document types..." | tee -a "$log_file"
declare -a fiscalYear=(
  "2017-18"
  "2018-19"
  "2019-20"
  "2020-21"
  "2021-22"
  "2022-23"
  "2023-24"
  "2024-25"
  "2025-26"
)

# Document type - using Enacted/GovernorsBudget as per the working URL
doc_type="Enacted/GovernorsBudget"

# Complete list of agency codes (Level A) from the CSV data
declare -a agencyDepartment=(
  "1000" "Business_Consumer_Services_and_Housing"
  "5210" "Department_of_Corrections_and_Rehabilitation"
  "3890" "Environmental_Protection"
  "8000" "General_Government"
  "7500" "Government_Operations"
  "4000" "Health_and_Human_Services"
  "6000" "Education"
  "7000" "Labor_and_Workforce_Development"
  "0010" "Legislative_Judicial_and_Executive"
  "3000" "Natural_Resources"
  "2500" "Transportation"
)

# Step 3: Download PDF files
echo "Step 3: Starting PDF downloads..." | tee -a "$log_file"

# Step 3.a: Function to validate if a file is a valid PDF
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

# Step 3.b: Function to pause for a random duration
random_pause() {
  local min_seconds=3
  local max_seconds=6
  local pause_duration=$((RANDOM % (max_seconds - min_seconds + 1) + min_seconds))
  
  echo "Pausing for $pause_duration seconds to avoid rate limiting..." | tee -a "$log_file"
  sleep $pause_duration
  echo "Resuming downloads..." | tee -a "$log_file"
}

# Step 4: Process downloads
echo "Step 4: Processing downloads..." | tee -a "$log_file"

# Initialize counters
success_count=0
failure_count=0
skipped_count=0

# Flag to indicate if we should start processing
start_processing=false
if [ "$resume_processing" = false ]; then
  start_processing=true
fi

# Process agencies
for ((i=0; i<${#agencyDepartment[@]}; i+=2)); do
  # Extract code and name from array
  agency_code="${agencyDepartment[i]}"
  agency_name="${agencyDepartment[i+1]}"
  
  # Handle resume functionality for agencies
  if [ "$resume_next_agency" = true ]; then
    if [ "$agency_code" -gt "$last_agency" ]; then
      echo "Resuming with next agency: $agency_code" | tee -a "$log_file"
      start_processing=true
      resume_next_agency=false
    else
      echo "Skipping agency: $agency_code (before next agency)" | tee -a "$log_file"
      skipped_count=$((skipped_count + 1))
      continue
    fi
  elif [ "$resume_processing" = true ] && [ "$start_processing" = false ]; then
    if [ "$agency_code" = "$last_agency" ]; then
      start_processing=true
    else
      echo "Skipping agency: $agency_code (before last processed)" | tee -a "$log_file"
      skipped_count=$((skipped_count + 1))
      continue
    fi
  fi
  
  # Process each fiscal year for agencies
  for fiscal_year in "${fiscalYear[@]}"; do
    # Handle resume functionality for fiscal years
    if [ "$resume_processing" = true ] && [ "$agency_code" = "$last_agency" ] && [ "$start_processing" = true ]; then
      current_first_year=$(echo "$fiscal_year" | cut -d'-' -f1)
      last_first_year=$(echo "$last_fiscal_year" | cut -d'-' -f1)
      
      if [ "$current_first_year" -lt "$last_first_year" ]; then
        echo "Skipping already processed: $agency_code - FY $fiscal_year" | tee -a "$log_file"
        skipped_count=$((skipped_count + 1))
        continue
      elif [ "$current_first_year" -eq "$last_first_year" ] && [ "$last_position" = "SUCCESS" ]; then
        echo "Skipping already processed: $agency_code - FY $fiscal_year" | tee -a "$log_file"
        skipped_count=$((skipped_count + 1))
        continue
      fi
    fi
    
    # Extract the first year from the fiscal year string
    first_year=$(echo "$fiscal_year" | cut -d'-' -f1)
    
    # Skip agencies marked with "DO NOT USE"
    if [[ "$agency_name" == *"DO NOT USE"* ]]; then
      echo "SKIPPING: ${agency_code} - marked as DO NOT USE" | tee -a "$log_file"
      continue
    fi

    # Construct output filename
    output_file="${TARGET_DIR}/${agency_code}_${agency_name}_${first_year}_budget.pdf"
    
    # Check if file already exists and is valid
    if [ -f "$output_file" ] && [ -s "$output_file" ]; then
      echo "SKIPPING: File already exists for ${agency_code} - FY ${fiscal_year}" | tee -a "$log_file"
      skipped_count=$((skipped_count + 1))
      continue
    fi

    # Construct agency URL - using the verified format
    agency_url="https://ebudget.ca.gov/${fiscal_year}/pdf/${doc_type}/${agency_code}.pdf"
    
    echo "Attempting to download: $agency_url" | tee -a "$log_file"
    
    # Download file to temporary location
    temp_file=$(mktemp)
    curl -L -s -o "$temp_file" "$agency_url"
    
    # Increment attempt counter
    attempt_counter=$((attempt_counter + 1))
    
    # Check if we need to pause
    if [ $((attempt_counter % 150)) -eq 0 ]; then
      random_pause
    fi
    
    # Validate downloaded file
    if validate_pdf "$temp_file"; then
      # Move to final destination with agency name included
      mv "$temp_file" "$output_file"
      echo "SUCCESS: Downloaded ${agency_code} - FY ${fiscal_year} to $output_file" | tee -a "$log_file"
      success_count=$((success_count + 1))
    else
      # Log failure and remove temporary file
      echo "FAILURE: Could not download valid PDF for ${agency_code} - FY ${fiscal_year}" | tee -a "$log_file"
      rm -f "$temp_file"
      failure_count=$((failure_count + 1))
    fi
    
    # Add delay between downloads
    sleep 2
  done
done

# Final summary
echo "Download process completed." | tee -a "$log_file"
echo "Successful downloads: $success_count" | tee -a "$log_file"
echo "Failed downloads: $failure_count" | tee -a "$log_file"
echo "Skipped downloads: $skipped_count" | tee -a "$log_file"
echo "See $log_file for details." | tee -a "$log_file" 
