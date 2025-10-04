import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
client = create_client(supabase_url, supabase_key)

def clear_all_unavailability():
    print('--- Deleting ALL unavailability periods ---')
    try:
        # Delete all rows from the table
        response = client.table('unavailability_periods').delete().gt('id', 0).execute()
        
        if response.data:
            print(f'Successfully deleted {len(response.data)} records.')
        else:
            print('No records to delete or an error occurred.')
            # print('Error details:', response)
            
    except Exception as e:
        print(f'An error occurred: {e}')

if __name__ == '__main__':
    clear_all_unavailability()
