#!/usr/bin/env python3
"""
Script to split a large JSON file containing knowledge items into smaller files.
Each output file will contain 5 items from the original array.
"""

import json
import os
import sys
from pathlib import Path

def split_json_file(input_file, items_per_file=20, output_dir=None):
    """
    Split a JSON file with an 'item' array into smaller files.
    
    Args:
        input_file (str): Path to the input JSON file
        items_per_file (int): Number of items per output file (default: 5)
        output_dir (str): Directory to save output files (default: same as input file)
    """
    
    # Validate input file
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' does not exist.")
        return False
    
    # Set output directory
    if output_dir is None:
        output_dir = os.path.dirname(input_file)
        if not output_dir:  # If input_file is in current directory
            output_dir = "."
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Read the input JSON file
        print(f"Reading input file: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Validate structure
        if 'item' not in data or not isinstance(data['item'], list):
            print("Error: Input file must contain an 'item' array.")
            return False
        
        items = data['item']
        total_items = len(items)
        print(f"Found {total_items} items in the input file.")
        
        # Calculate number of output files needed
        num_files = (total_items + items_per_file - 1) // items_per_file
        print(f"Will create {num_files} output files with {items_per_file} items each.")
        
        # Get base filename without extension
        base_name = Path(input_file).stem
        
        # Split items into chunks and create output files
        for i in range(num_files):
            start_idx = i * items_per_file
            end_idx = min(start_idx + items_per_file, total_items)
            
            # Create chunk of items
            chunk_items = items[start_idx:end_idx]
            
            # Create output data structure
            output_data = {
                "item": chunk_items
            }
            
            # Generate output filename
            output_filename = f"{base_name}_part_{i+1:03d}.md"
            output_path = os.path.join(output_dir, output_filename)
            
            # Write output file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            print(f"Created: {output_filename} (items {start_idx+1}-{end_idx})")
        
        print(f"\nSuccessfully split {total_items} items into {num_files} files.")
        return True
        
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Main function to handle command line arguments."""
    
    if len(sys.argv) < 2:
        print("Usage: python split_json.py <input_file> [items_per_file] [output_dir]")
        print("Example: python split_json.py visible_knowledgeItems_prod.json 5")
        print("Output files will have .txt extension")
        sys.exit(1)
    
    input_file = sys.argv[1]
    items_per_file = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    output_dir = sys.argv[3] if len(sys.argv) > 3 else None
    
    print(f"Input file: {input_file}")
    print(f"Items per file: {items_per_file}")
    print(f"Output directory: {output_dir or 'same as input file'}")
    print("-" * 50)
    
    success = split_json_file(input_file, items_per_file, output_dir)
    
    if success:
        print("\n✅ Splitting completed successfully!")
    else:
        print("\n❌ Splitting failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
