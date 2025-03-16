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

# Define directories
BUDGET_DOCS_DIR = "./src/data/budget_docs"
TEXT_OUTPUT_DIR = "./src/data/budget_docs/text"

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

def main():
    """Main function to extract text from all PDFs."""
    # Ensure output directory exists
    ensure_directory_exists(TEXT_OUTPUT_DIR)
    
    # Get all PDF files in the budget_docs directory
    pdf_files = glob.glob(os.path.join(BUDGET_DOCS_DIR, "*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {BUDGET_DOCS_DIR}")
        sys.exit(0)
    
    print(f"Found {len(pdf_files)} PDF files to process")
    
    # Process each PDF file
    success_count = 0
    for pdf_file in pdf_files:
        # Create output path with .txt extension
        base_name = os.path.basename(pdf_file)
        name_without_ext = os.path.splitext(base_name)[0]
        output_path = os.path.join(TEXT_OUTPUT_DIR, f"{name_without_ext}.txt")
        
        # Extract text
        if extract_text_from_pdf(pdf_file, output_path):
            success_count += 1
    
    print(f"Successfully extracted text from {success_count} of {len(pdf_files)} PDF files")
    print(f"Text files saved to {TEXT_OUTPUT_DIR}")

if __name__ == "__main__":
    main() 