#!/usr/bin/env python3
"""
PDF Text Extractor for Budget Documents

This script extracts text from PDF files in the budget_docs directory
and saves it as text files with the same name but .txt extension.
Uses PyMuPDF (fitz) to extract text while preserving layout.
"""

import os
import sys
import glob
from pathlib import Path
import fitz  # PyMuPDF
from datetime import datetime
import re

# Define directories
BUDGET_DOCS_DIR = "./src/data/budget_docs"
TEXT_OUTPUT_DIR = "./src/data/budget_docs/text"

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

def extract_text_from_pdf(pdf_path, output_path):
    """Extract text from PDF using PyMuPDF."""
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)
        text = ""
        
        # Extract text from each page while preserving layout
        for page in doc:
            text += page.get_text("text")  # "text" mode preserves layout
        
        # Write text to output file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
            
        print(f"Extracted text from {pdf_path} to {output_path}")
        return True
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
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

def main():
    """Main function to extract text from PDFs within year range."""
    # Get year range from user
    start_year, end_year = get_year_range()
    
    # Ensure output directory exists
    ensure_directory_exists(TEXT_OUTPUT_DIR)
    
    # Get all PDF files in the budget_docs directory
    pdf_files = glob.glob(os.path.join(BUDGET_DOCS_DIR, "*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {BUDGET_DOCS_DIR}")
        sys.exit(0)
    
    # Filter PDFs by year range
    filtered_pdfs = filter_pdfs_by_year(pdf_files, start_year, end_year)
    
    if not filtered_pdfs:
        print(f"No PDF files found for years {start_year}-{end_year}")
        sys.exit(0)
    
    print(f"Found {len(filtered_pdfs)} PDF files to process for years {start_year}-{end_year}")
    
    # Process each PDF file
    success_count = 0
    for pdf_file in filtered_pdfs:
        # Create output path with .txt extension
        base_name = os.path.basename(pdf_file)
        name_without_ext = os.path.splitext(base_name)[0]
        output_path = os.path.join(TEXT_OUTPUT_DIR, f"{name_without_ext}.txt")
        
        # Extract text
        if extract_text_from_pdf(pdf_file, output_path):
            success_count += 1
    
    print(f"Successfully extracted text from {success_count} of {len(filtered_pdfs)} PDF files")
    print(f"Text files saved to {TEXT_OUTPUT_DIR}")

if __name__ == "__main__":
    main() 