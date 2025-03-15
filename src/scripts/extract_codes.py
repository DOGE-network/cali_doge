import fitz  # PyMuPDF
import re
import statistics
from collections import defaultdict

def extract_org_structure(pdf_path):
    """
    Extract organizational structure from PDF based on horizontal position.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        list: List of structured organization items
    """
    # Open the PDF file
    pdf_document = fitz.open(pdf_path)
    
    # First pass: collect x-positions to determine level thresholds
    x_positions = []
    code_positions = defaultdict(list)
    
    for page_num in range(len(pdf_document)):
        page = pdf_document[page_num]
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        match = re.match(r'^(\d{4})\s+(.*)', text)
                        if match:
                            code = match.group(1)
                            x_pos = span["origin"][0]
                            x_positions.append(x_pos)
                            code_positions[x_pos].append((code, match.group(2)))
    
    # Determine position clusters
    if not x_positions:
        print("No structured data found in the PDF.")
        pdf_document.close()
        return []
    
    # Group similar x-positions
    x_positions.sort()
    position_clusters = []
    current_cluster = [x_positions[0]]
    
    for i in range(1, len(x_positions)):
        if x_positions[i] - x_positions[i-1] > 15:  # New cluster if gap > 15 points
            position_clusters.append(current_cluster)
            current_cluster = [x_positions[i]]
        else:
            current_cluster.append(x_positions[i])
    
    position_clusters.append(current_cluster)
    
    # Calculate median position for each cluster
    cluster_medians = [statistics.median(cluster) for cluster in position_clusters]
    cluster_medians.sort()
    
    # Map clusters to levels
    level_thresholds = {}
    level_labels = ["A", "1", "2", "3"]
    
    for i, median in enumerate(cluster_medians):
        if i < len(level_labels):
            level_thresholds[level_labels[i]] = (median - 10, median + 10)
    
    # Second pass: extract structured data using determined thresholds
    structured_data = []
    
    for page_num in range(len(pdf_document)):
        page = pdf_document[page_num]
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        match = re.match(r'^(\d{4})\s+(.*)', text)
                        if match:
                            code = match.group(1)
                            description = match.group(2)
                            x_pos = span["origin"][0]
                            
                            # Determine level based on position
                            level = "Unknown"
                            for lvl, (min_pos, max_pos) in level_thresholds.items():
                                if min_pos <= x_pos <= max_pos:
                                    level = lvl
                                    break
                            
                            # If not in any threshold range, find closest
                            if level == "Unknown":
                                closest_level = min(level_thresholds.keys(), 
                                                  key=lambda k: min(abs(x_pos - level_thresholds[k][0]), 
                                                                   abs(x_pos - level_thresholds[k][1])))
                                level = closest_level
                            
                            structured_data.append({
                                "level": level,
                                "code": code,
                                "description": description,
                                "x_position": x_pos,
                                "page": page_num + 1
                            })
    
    # Close the document
    pdf_document.close()
    
    # Sort by page and then by code
    structured_data.sort(key=lambda x: (x["page"], x["code"]))
    
    return structured_data

def print_hierarchy(data):
    """
    Print the organizational hierarchy in a readable format.
    
    Args:
        data (list): List of structured organization items
    """
    current_agency = None
    current_dept = None
    current_subdept = None
    
    for item in data:
        level = item["level"]
        code = item["code"]
        description = item["description"]
        
        if level == "A":
            print(f"\nA level agency code {code} {description}")
            current_agency = code
            current_dept = None
            current_subdept = None
        elif level == "1":
            print(f"  1 level department code {code} {description}")
            current_dept = code
            current_subdept = None
        elif level == "2":
            print(f"    2 level sub-department code {code} {description}")
            current_subdept = code
        elif level == "3":
            print(f"      3 level unit code {code} {description}")

# Example usage
if __name__ == "__main__":
    pdf_path = "3orgstruc.pdf"
    
    # Extract structured data
    org_data = extract_org_structure(pdf_path)
    
    # Print the hierarchy
    print_hierarchy(org_data)
    
    # Save to CSV
    import csv
    with open('org_structure.csv', 'w', newline='') as csvfile:
        fieldnames = ['level', 'code', 'description', 'x_position', 'page']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for item in org_data:
            writer.writerow(item)
    
    print(f"\nExtracted {len(org_data)} items from the PDF.")
    print("Data has been saved to 'org_structure.csv'")
