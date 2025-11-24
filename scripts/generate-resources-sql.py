#!/usr/bin/env python3
"""
Generate SQL INSERT statement from CSV file
Usage: python scripts/generate-resources-sql.py path/to/resources.csv
"""

import sys
import os
from pathlib import Path

def parse_csv_line(line):
    """Parse a CSV line handling quoted fields"""
    result = []
    current = ''
    in_quotes = False
    
    for char in line:
        if char == '"':
            in_quotes = not in_quotes
            current += char
        elif char == ',' and not in_quotes:
            result.append(current.strip())
            current = ''
        else:
            current += char
    result.append(current.strip())
    return result

def escape_sql_string(value):
    """Escape SQL string and handle NULL values"""
    if not value or value.strip() == '':
        return 'NULL'
    # Remove surrounding quotes if present
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    # Replace newlines with spaces
    value = value.replace('\n', ' ').replace('\r', ' ')
    # Escape single quotes by doubling them
    escaped = value.replace("'", "''")
    return f"'{escaped}'"

def format_array(tags):
    """Convert comma-separated tags to PostgreSQL array format"""
    if not tags or tags.strip() == '':
        return "ARRAY[]::TEXT[]"
    # Remove surrounding quotes if present
    if tags.startswith('"') and tags.endswith('"'):
        tags = tags[1:-1]
    tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
    if not tag_list:
        return "ARRAY[]::TEXT[]"
    escaped_tags = []
    for tag in tag_list:
        escaped_tag = tag.replace("'", "''")
        escaped_tags.append(f"'{escaped_tag}'")
    return f"ARRAY[{', '.join(escaped_tags)}]"

def main():
    import csv
    import io
    
    # Get CSV file path from command line argument or use default
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    else:
        csv_path = os.path.join(os.path.expanduser('~'), 'Downloads', 'Team Resources-Grid view.csv')
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)
    
    # Read entire file content
    with open(csv_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Use csv module with StringIO to handle multi-line quoted fields
    # First, we need to reconstruct proper CSV rows
    lines = content.split('\n')
    reconstructed_lines = []
    current_row = ''
    quote_count = 0
    
    for line in lines:
        current_row += (('\n' if current_row else '') + line)
        quote_count += line.count('"')
        # If we have an even number of quotes, the row is complete
        if quote_count % 2 == 0 and current_row.strip():
            reconstructed_lines.append(current_row)
            current_row = ''
            quote_count = 0
    
    # Handle any remaining content
    if current_row.strip():
        reconstructed_lines.append(current_row)
    
    # Now parse with csv module
    records = []
    if reconstructed_lines:
        # Parse header - strip BOM if present
        header_line = reconstructed_lines[0]
        if header_line.startswith('\ufeff'):
            header_line = header_line[1:]
        header_reader = csv.reader(io.StringIO(header_line))
        headers = next(header_reader)
        # Clean headers
        headers = [h.strip().strip('\ufeff') for h in headers]
        
        # Parse data rows
        for row_text in reconstructed_lines[1:]:
            reader = csv.reader(io.StringIO(row_text))
            try:
                values = next(reader)
                if len(values) >= len(headers):
                    record = {}
                    for idx, header in enumerate(headers):
                        record[header] = values[idx] if idx < len(values) else ''
                    records.append(record)
            except Exception as e:
                print(f"Warning: Error parsing row: {e}", file=sys.stderr)
                continue
    
    print(f"Found {len(records)} resources to process", file=sys.stderr)
    
    # Generate SQL INSERT statements
    sql_lines = []
    sql_lines.append('-- Insert team resources from CSV')
    sql_lines.append('-- Generated from Team Resources-Grid view.csv')
    sql_lines.append('')
    sql_lines.append('INSERT INTO public.resources (name, primary_category, secondary_tags, link, source, description, username, password, instructions, documentation) VALUES')
    sql_lines.append('')
    
    value_rows = []
    
    for record in records:
        # Clean up the name field
        name = record.get('Name', '').strip()
        if name.startswith('"') and name.endswith('"'):
            name = name[1:-1]
        name = name.replace('\n', ' ').replace('\r', ' ').strip()
        
        if not name:
            print(f"Warning: Skipping record with no name", file=sys.stderr)
            continue
        
        primary_category = record.get('Primary', '').strip()
        if primary_category.startswith('"') and primary_category.endswith('"'):
            primary_category = primary_category[1:-1]
        primary_category = primary_category or 'Other'
        
        secondary_tags = record.get('Secondary', '').strip()
        link = record.get('Link', '').strip()
        if link.startswith('"') and link.endswith('"'):
            link = link[1:-1]
        
        source = record.get('Source', '').strip()
        if source.startswith('"') and source.endswith('"'):
            source = source[1:-1]
        source = source or None
        
        description = record.get('Description', '').strip()
        if description.startswith('"') and description.endswith('"'):
            description = description[1:-1]
        description = description or None
        
        username = record.get('Username', '').strip()
        if username.startswith('"') and username.endswith('"'):
            username = username[1:-1]
        username = username or None
        
        password = record.get('Password', '').strip()
        if password.startswith('"') and password.endswith('"'):
            password = password[1:-1]
        password = password or None
        
        instructions = record.get('Instructions', '').strip()
        if instructions.startswith('"') and instructions.endswith('"'):
            instructions = instructions[1:-1]
        instructions = instructions or None
        
        documentation = record.get('Documentation', '').strip()
        if documentation.startswith('"') and documentation.endswith('"'):
            documentation = documentation[1:-1]
        documentation = documentation or None
        
        # Build the VALUES row
        values = [
            escape_sql_string(name),
            escape_sql_string(primary_category),
            format_array(secondary_tags),
            escape_sql_string(link),
            escape_sql_string(source),
            escape_sql_string(description),
            escape_sql_string(username),
            escape_sql_string(password),
            escape_sql_string(instructions),
            escape_sql_string(documentation)
        ]
        
        value_rows.append(f"  ({', '.join(values)})")
    
    # Join all value rows with commas
    sql_lines.append(',\n'.join(value_rows))
    sql_lines.append(';')
    sql_lines.append('')
    
    # Write to SQL file
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / 'supabase' / 'insert-resources.sql'
    
    sql_content = '\n'.join(sql_lines)
    output_path.write_text(sql_content, encoding='utf-8')
    
    print(f"SQL file generated: {output_path}", file=sys.stderr)
    print(f"Total records: {len(value_rows)}", file=sys.stderr)

if __name__ == '__main__':
    main()
