import csv
import sys

def check_csv_data(filepath='joe_jackson_tickets_cleaned.csv'):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            print(f"✅ Successfully loaded {len(rows)} records from {filepath}")
            
            categories = {}
            countries = {}
            for row in rows:
                cat = row.get('KATEGORIE', 'Unknown')
                categories[cat] = categories.get(cat, 0) + 1
                
                country = row.get('STAT', 'Unknown')
                countries[country] = countries.get(country, 0) + 1
                
            print("\nCategories breakdown:")
            for k, v in categories.items():
                print(f"  - {k}: {v}")
                
            print(f"\nTotal countries represented: {len(countries)}")
    except Exception as e:
        print(f"❌ Error checking CSV data: {e}")

if __name__ == "__main__":
    file_arg = sys.argv[1] if len(sys.argv) > 1 else 'joe_jackson_tickets_cleaned.csv'
    check_csv_data(file_arg)
