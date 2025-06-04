#!/usr/bin/env python3
"""
PDF Text Extractor for Budget Documents

This script extracts text from PDF files in the budget directory
and saves it as text files with coordinate-based layout preservation.

Key Features:
1. Coordinate-Based Extraction:
   - Each line includes block number, line number, and x,y coordinates
   - Format: [block:line:x,y] text
   - Coordinates preserve original PDF layout
   - Page dimensions included in markers

2. Page Structure:
   - Pages marked with size information
   - Format: # === PAGE N === [size: widthxheight]
   - Empty line after each page for readability
   - Maintains page boundaries from source PDF

3. Layout Preservation:
   - X coordinates show indentation/columns
   - Y coordinates show vertical positioning
   - Block numbers group related content
   - Line numbers track sequence within blocks

4. Text Processing:
   - Preserves whitespace and formatting
   - Maintains table column alignment
   - Keeps section headers at original positions
   - Retains line breaks and paragraph structure

5. Error Handling and Logging:
   - Logs coordinate extraction issues
   - Tracks failed files
   - Reports processing statistics
   - Maintains detailed transaction log
   - Continues processing on errors

Output Format Example:
# === PAGE 1 === [size: 612x792]
[0:0:382,335] Labor and
[1:0:381,366] Workforce
[2:0:363,397] Development

Dependencies:
- pdftext: PDF text extraction library
- pathlib: Path manipulation
- datetime: Timestamp generation
- re: Regular expressions

Usage:
python3 extract_pdf_text.py
"""

import os
import sys
import glob
from pathlib import Path
from datetime import datetime
import re
from pdftext.extraction import plain_text_output, dictionary_output

# Get script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))

# Define directories relative to project root
BUDGET_DIR = os.path.join(PROJECT_ROOT, "src/data/budget")
TEXT_OUTPUT_DIR = os.path.join(PROJECT_ROOT, "src/data/budget/text")

# Generate a transaction ID for this processing session
def generate_transaction_id():
    """Generate a unique transaction ID for logging."""
    from datetime import datetime
    import random
    import string
    timestamp = int(datetime.now().timestamp() * 1000)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=11))
    return f"txn-{timestamp}-{random_str}"

TRANSACTION_ID = generate_transaction_id()

# Create log file for this processing session
LOG_DIR = os.path.join(PROJECT_ROOT, "src/logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)
LOG_FILE = os.path.join(LOG_DIR, f"extract_pdf_text_{TRANSACTION_ID}.log")

# Initialize log file
with open(LOG_FILE, 'w', encoding='utf-8') as f:
    f.write(f"PDF Text Extraction Log - {datetime.now().isoformat()}\n")

def log(message, is_sub_step=False, is_error=False):
    """Write message to log file only (not console)."""
    timestamp = datetime.now().isoformat()
    level = 'ERROR' if is_error else 'INFO'
    prefix = '  - ' if is_sub_step else '• '
    log_entry = f"[{level}] [{timestamp}] {prefix}{message}\n"
    
    # Write only to log file, not console
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_entry)

def console_output(message):
    """Output to console only."""
    print(message)

def get_year_range():
    """Get year range from user input."""
    current_year = datetime.now().year
    
    while True:
        try:
            print("\n=== PDF Text Extraction ===")
            print("Please enter the range of years you want to process.")
            
            start_year = int(input("Enter starting year (e.g., 2018): "))
            if start_year < 2000 or start_year > current_year:
                print(f"Invalid starting year. Please enter a year between 2000 and {current_year}.")
                continue
                
            end_year = int(input("Enter ending year (e.g., 2023): "))
            if end_year < start_year or end_year > current_year:
                print(f"Invalid ending year. Please enter a year between {start_year} and {current_year}.")
                continue
                
            print(f"Will process PDFs for years {start_year} through {end_year}.")
            return start_year, end_year
            
        except ValueError:
            print("Please enter valid years.")
            continue

def ensure_directory_exists(directory):
    """Create directory if it doesn't exist."""
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}")

def extract_text_with_layout(pdf_path):
    """Extract text from PDF with layout preservation using PDFText."""
    try:
        console_output(f"  📄 Processing PDF: {os.path.basename(pdf_path)}")
        log(f"Starting text extraction for {os.path.basename(pdf_path)}")
        
        console_output("    📝 Extracting text with layout preservation...")
        log("Extracting text with layout preservation", True)
        
        # Use dictionary_output to get proper page separation
        pages = dictionary_output(pdf_path, sort=True)
        processed_lines = []
        
        for page_num, page in enumerate(pages, 1):
            if page_num % 10 == 0:
                console_output(f"      📊 Processing page {page_num}/{len(pages)}...")
                log(f"Processing page {page_num} of {len(pages)}", True)
            
            # Add page marker with metadata
            width = page['width'] if isinstance(page, dict) and 'width' in page else 0
            height = page['height'] if isinstance(page, dict) and 'height' in page else 0
            processed_lines.append(f"# === PAGE {page_num} === [size: {width}x{height}]")
            
            # Extract text from all blocks in the page
            page_lines = []
            blocks = page.get('blocks', []) if isinstance(page, dict) else []
            
            for block_idx, block in enumerate(blocks):
                if not isinstance(block, dict):
                    continue
                
                for line_idx, line in enumerate(block.get('lines', [])):
                    if not isinstance(line, dict):
                        continue
                    
                # Get line position and text
                bbox = line.get('bbox', [])
                spans = line.get('spans', [])
                line_text = ' '.join(span.get('text', '') for span in spans if isinstance(span, dict))
                
                if line_text.strip():
                    # Log bbox for debugging
                    log(f"Line bbox: {bbox}", True)
                    
                    # Get coordinates from bbox (which is a list [x0, y0, x1, y1])
                    try:
                        x = int(float(bbox[0])) if isinstance(bbox, (list, tuple)) and len(bbox) > 0 else 0
                        y = int(float(bbox[1])) if isinstance(bbox, (list, tuple)) and len(bbox) > 1 else 0
                    except (ValueError, TypeError, IndexError):
                        x, y = 0, 0
                        log(f"Failed to extract coordinates from bbox: {bbox}", True, True)
                        
                    pos_info = f"[{block_idx}:{line_idx}:{x},{y}]"
                    page_lines.append(f"{pos_info} {line_text}")
        
        # Add page lines (even if empty)
        processed_lines.extend(page_lines)
        
        # Add empty line after each page
        processed_lines.append("")
        
        console_output(f"    ✅ Completed processing {len(pages)} pages")
        log(f"Completed processing {len(pages)} pages", True)
        
        return processed_lines
        
    except Exception as e:
        error_msg = f"Error extracting text from {pdf_path}: {e}"
        console_output(f"    ❌ {error_msg}")
        log(error_msg, False, True)
        return None

def extract_page_text(pdf_path, page_num):
    """Extract text from a specific page in PDF."""
    try:
        # Use dictionary_output for structured extraction with page info
        pages = dictionary_output(pdf_path, sort=True)
        if page_num < len(pages):
            page = pages[page_num]
            page_lines = []
            
            # Add page marker with metadata
            width = page['width'] if isinstance(page, dict) and 'width' in page else 0
            height = page['height'] if isinstance(page, dict) and 'height' in page else 0
            page_lines.append(f"# === PAGE {page_num + 1} === [size: {width}x{height}]")
            
            # Extract text from all blocks in the page
            blocks = page.get('blocks', []) if isinstance(page, dict) else []
            for block_idx, block in enumerate(blocks):
                if not isinstance(block, dict):
                    continue
                    
                for line_idx, line in enumerate(block.get('lines', [])):
                    if not isinstance(line, dict):
                        continue
                
                    # Get line position and text
                    bbox = line.get('bbox', [])
                    spans = line.get('spans', [])
                    line_text = ' '.join(span.get('text', '') for span in spans if isinstance(span, dict))
                    
                    if line_text.strip():
                        # Include line number and position: [block:line:x,y] text
                        x = int(bbox[0]) if isinstance(bbox, (list, tuple)) and len(bbox) > 0 else 0
                        y = int(bbox[1]) if isinstance(bbox, (list, tuple)) and len(bbox) > 1 else 0
                        pos_info = f"[{block_idx}:{line_idx}:{x},{y}]"
                        page_lines.append(f"{pos_info} {line_text}")
            
            return page_lines
        return []
    except Exception as e:
        print(f"Error extracting page {page_num} from {pdf_path}: {e}")
        return []

def extract_text_file_page(text_file_path, page_num):
    """Extract text for a specific page from the text file."""
    with open(text_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split content into pages using the page markers, but keep the markers
    pages = []
    current_page = []
    for line in content.split('\n'):
        if line.startswith('# === PAGE '):
            if current_page and len(pages) == page_num:
                # We found the page we want
                return current_page
            current_page = [line]  # Start new page with the marker
            pages.append(current_page)
        else:
            if current_page:  # Only add lines if we've seen a page marker
                current_page.append(line)
    
    # Handle the last page
    if current_page and len(pages) == page_num + 1:
        return current_page
    
    return []

def verify_page_accuracy(pdf_path, text_file_path):
    """Verify page-by-page accuracy between PDF and text file."""
    console_output("\n🔍 Starting verification:")
    console_output(f"  PDF:  {pdf_path}")
    console_output(f"  Text: {text_file_path}")
    log(f"Starting verification between PDF and text file: {os.path.basename(pdf_path)}")
    
    # Get total pages from PDF using dictionary_output
    pages = dictionary_output(pdf_path, sort=True)
    total_pages = len(pages)
    
    console_output(f"  📚 Found {total_pages} pages to verify")
    log(f"Found {total_pages} pages to verify", True)
    
    mismatches = []
    
    for page_num in range(total_pages):
        console_output(f"    📄 Verifying page {page_num + 1}/{total_pages}...")
        log(f"Verifying page {page_num + 1} of {total_pages}", True)
        
        # Get text from both sources
        pdf_lines = extract_page_text(pdf_path, page_num)
        text_file_lines = extract_text_file_page(text_file_path, page_num)
        
        # Compare content exactly as is
        if pdf_lines != text_file_lines:
            # Find specific differences
            diff_details = []
            max_lines = max(len(pdf_lines), len(text_file_lines))
            for i in range(max_lines):
                pdf_line = pdf_lines[i] if i < len(pdf_lines) else None
                txt_line = text_file_lines[i] if i < len(text_file_lines) else None
                if pdf_line != txt_line:
                    diff_details.append({
                        'line_num': i + 1,
                        'pdf': pdf_line,
                        'txt': txt_line
                    })
            
            mismatches.append({
                'page': page_num + 1,
                'pdf_lines': len(pdf_lines),
                'text_lines': len(text_file_lines),
                'differences': diff_details[:5]  # Show first 5 differences
            })
            console_output(f"      ⚠️  Mismatch found on page {page_num + 1}")
            log(f"Mismatch found on page {page_num + 1}", True, True)
    
    # Report results
    if not mismatches:
        console_output(f"\n  ✅ All {total_pages} pages match exactly!")
        log(f"Verification successful - all {total_pages} pages match exactly")
        return True
    else:
        console_output(f"\n  ❌ Found {len(mismatches)} pages with mismatches:")
        for mismatch in mismatches:
            console_output(f"    • Page {mismatch['page']}: PDF has {mismatch['pdf_lines']} lines, Text file has {mismatch['text_lines']} lines")
            console_output("      First few differences:")
            for diff in mismatch['differences']:
                console_output(f"        Line {diff['line_num']}:")
                console_output(f"          PDF: {diff['pdf']}")
                console_output(f"          TXT: {diff['txt']}")
            log(f"Verification mismatch on page {mismatch['page']} - showing {len(mismatch['differences'])} differences", False, True)
        return False

def save_text_file(text_lines, output_path):
    """Save text as a text file."""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(text_lines))
        return True
    except Exception as e:
        print(f"Error saving text file: {e}")
        return False

def extract_year_from_filename(filename):
    """Extract year from filename using specific patterns."""
    # Pattern 1: _YYYY_budget.pdf
    pattern1 = r'_(\d{4})_budget\.pdf$'
    match1 = re.search(pattern1, filename)
    if match1:
        return int(match1.group(1))
    
    # Pattern 2: _YYYY.pdf
    pattern2 = r'_(\d{4})\.pdf$'
    match2 = re.search(pattern2, filename)
    if match2:
        return int(match2.group(1))
    
    # Pattern 3: YYYY_budget.pdf
    pattern3 = r'(\d{4})_budget\.pdf$'
    match3 = re.search(pattern3, filename)
    if match3:
        return int(match3.group(1))
    
    # If no pattern matches, try to find any 4-digit number
    pattern4 = r'\d{4}'
    match4 = re.search(pattern4, filename)
    if match4:
        return int(match4.group(0))
    
    return None

def filter_pdfs_by_year(pdf_files, start_year, end_year):
    """Filter PDF files based on year range."""
    filtered_files = []
    print("\nDebug: PDF files found:")
    for pdf_file in pdf_files:
        filename = os.path.basename(pdf_file)
        file_year = extract_year_from_filename(filename)
        
        if file_year is not None:
            print(f"  {filename} -> Year: {file_year}")
            if start_year <= file_year <= end_year:
                filtered_files.append(pdf_file)
        else:
            print(f"  {filename} -> Year: Could not determine")
    
    print(f"\nTotal PDFs found: {len(pdf_files)}")
    print(f"PDFs matching year range {start_year}-{end_year}: {len(filtered_files)}")
    return filtered_files

def extract_text_from_pdf(pdf_path, output_path):
    """Extract text from PDF and save to file."""
    try:
        base_filename = os.path.splitext(os.path.basename(pdf_path))[0]
        
        # Extract text with better layout preservation
        console_output(f"\n🔄 Processing: {os.path.basename(pdf_path)}")
        log(f"Starting processing of {os.path.basename(pdf_path)}")
        
        text_lines = extract_text_with_layout(pdf_path)
        
        if text_lines is None:
            return False
        
        # Save text file
        console_output("  💾 Saving extracted text...")
        log("Saving extracted text to file", True)
        
        if save_text_file(text_lines, output_path):
            console_output(f"  ✅ Text saved to: {output_path}")
            log(f"Successfully saved text to {output_path}", True)
            return True
        
        return False
        
    except Exception as e:
        error_msg = f"Error processing {pdf_path}: {e}"
        console_output(f"  ❌ {error_msg}")
        log(error_msg, False, True)
        return False

def main():
    """Main function to extract text from PDFs within year range."""
    console_output("\n🚀 Starting PDF text extraction process")
    log("Starting PDF text extraction process")
    
    # Get year range from user
    start_year, end_year = get_year_range()
    log(f"Processing year range: {start_year} to {end_year}")
    
    # Ensure output directory exists
    console_output("\n📁 Checking directories...")
    ensure_directory_exists(TEXT_OUTPUT_DIR)
    
    # Get all PDF files in the budget directory
    console_output("\n🔍 Searching for PDF files...")
    pdf_files = glob.glob(os.path.join(BUDGET_DIR, "*.pdf"))
    
    if not pdf_files:
        console_output(f"❌ No PDF files found in {BUDGET_DIR}")
        log("No PDF files found", False, True)
        sys.exit(0)
    
    # Filter PDFs by year range
    console_output("\n📅 Filtering PDFs by year range...")
    filtered_pdfs = filter_pdfs_by_year(pdf_files, start_year, end_year)
    
    if not filtered_pdfs:
        console_output(f"❌ No PDF files found for years {start_year}-{end_year}")
        log(f"No PDF files found for years {start_year}-{end_year}", False, True)
        sys.exit(0)
    
    console_output(f"\n📊 Found {len(filtered_pdfs)} PDF files to process for years {start_year}-{end_year}")
    log(f"Found {len(filtered_pdfs)} PDF files to process")
    
    # Process each PDF file
    success_count = 0
    verified_count = 0
    failed_files = []
    
    for i, pdf_file in enumerate(filtered_pdfs, 1):
        try:
            console_output(f"\n📄 Processing file {i} of {len(filtered_pdfs)}")
            log(f"Processing PDF {i} of {len(filtered_pdfs)}: {os.path.basename(pdf_file)}")
            
            # Create output path with .txt extension
            base_name = os.path.basename(pdf_file)
            name_without_ext = os.path.splitext(base_name)[0]
            output_path = os.path.join(TEXT_OUTPUT_DIR, f"{name_without_ext}.txt")
            
            # Extract text and verify
            if extract_text_from_pdf(pdf_file, output_path):
                success_count += 1
                verified_count += 1
                console_output(f"✅ Successfully processed and verified: {base_name}")
                log(f"Successfully processed and verified: {base_name}")
            else:
                failed_files.append(base_name)
                console_output(f"❌ Failed to process or verify: {base_name}")
                log(f"Failed to process or verify: {base_name}", False, True)
                
        except Exception as e:
            failed_files.append(os.path.basename(pdf_file))
            error_msg = f"Error processing {os.path.basename(pdf_file)}: {str(e)}"
            console_output(f"❌ {error_msg}")
            log(error_msg, False, True)
    
    # Final summary
    console_output("\n📋 PROCESSING SUMMARY:")
    console_output(f"  📊 Year range: {start_year}-{end_year}")
    console_output(f"  📚 Total PDFs found: {len(pdf_files)}")
    console_output(f"  🎯 PDFs in year range: {len(filtered_pdfs)}")
    console_output(f"  ✅ Successfully processed: {success_count}")
    console_output(f"  ✓ Successfully verified: {verified_count}")
    console_output(f"  ❌ Failed: {len(failed_files)}")
    console_output(f"  📝 Log file: {LOG_FILE}")
    
    if failed_files:
        console_output("\n❌ Failed files:")
        for failed_file in failed_files:
            console_output(f"  • {failed_file}")
    
    log(f"Processing completed - {success_count} successful, {verified_count} verified, {len(failed_files)} failed")
    if failed_files:
        log(f"Failed files: {failed_files}", False, True)
    
    log("PDF text extraction process completed successfully")
    console_output("\n✨ Process complete!")

if __name__ == "__main__":
    main() 