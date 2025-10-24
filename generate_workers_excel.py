#!/usr/bin/env python3
"""
Generate Excel file with all worker information and availability data
"""
import requests
import json
import pandas as pd
from datetime import datetime
import os

# Configuration
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

def get_workers_data():
    """Fetch all workers data"""
    try:
        response = requests.get(f"{API_BASE}/workers")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching workers: {e}")
        return []

def get_worker_availability(worker_id):
    """Fetch availability data for a specific worker"""
    try:
        response = requests.get(f"{API_BASE}/workers/{worker_id}/availability")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching availability for worker {worker_id}: {e}")
        return None

def format_availability(availability_data):
    """Format availability data into readable strings"""
    if not availability_data or 'rules' not in availability_data:
        return "No availability set"
    
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    availability_text = []
    
    for rule in availability_data['rules']:
        day_name = days[rule['weekday']]
        
        if rule['is_full_day']:
            availability_text.append(f"{day_name}: Full Day")
        elif rule['wraps_midnight']:
            from_time = rule['from_time'][:5] if rule['from_time'] else '00:00'
            to_time = rule['to_time'][:5] if rule['to_time'] else '00:00'
            availability_text.append(f"{day_name}: {from_time}-{to_time} (overnight)")
        else:
            from_time = rule['from_time'][:5] if rule['from_time'] else '00:00'
            to_time = rule['to_time'][:5] if rule['to_time'] else '00:00'
            availability_text.append(f"{day_name}: {from_time}-{to_time}")
    
    return "\n".join(availability_text) if availability_text else "No availability set"

def main():
    print("🔄 Fetching workers data...")
    workers = get_workers_data()
    
    if not workers:
        print("❌ No workers data found")
        return
    
    print(f"✅ Found {len(workers)} workers")
    
    # Prepare data for Excel
    excel_data = []
    
    for worker in workers:
        print(f"📋 Processing {worker['full_name']}...")
        
        # Get availability data
        availability = get_worker_availability(worker['id'])
        availability_text = format_availability(availability)
        
        # Prepare row data
        row_data = {
            'ID': worker['id'],
            'Code': worker['code'],
            'Full Name': worker['full_name'],
            'Email': worker['email'],
            'Phone': worker['phone'],
            'Status': worker['status'],
            'Max Hours': worker['max_hours'],
            'Car': worker['car'],
            'Skills': worker['skills'],
            'Sex': worker['sex'],
            'Telegram': worker['telegram'],
            'Availability': availability_text
        }
        
        excel_data.append(row_data)
    
    # Create DataFrame
    df = pd.DataFrame(excel_data)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"workers_availability_report_{timestamp}.xlsx"
    
    # Create Excel file with formatting
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        # Write main data
        df.to_excel(writer, sheet_name='Workers & Availability', index=False)
        
        # Get the workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets['Workers & Availability']
        
        # Auto-adjust column widths
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            
            adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
            worksheet.column_dimensions[column_letter].width = adjusted_width
        
        # Special formatting for availability column
        worksheet.column_dimensions['L'].width = 60  # Availability column
    
    print(f"✅ Excel file created: {filename}")
    print(f"📊 Total workers: {len(workers)}")
    print(f"📁 File location: {os.path.abspath(filename)}")

if __name__ == "__main__":
    main()


