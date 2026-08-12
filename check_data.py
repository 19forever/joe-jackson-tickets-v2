import csv
import os
import re
import urllib.request
import urllib.error

CSV_FILE = 'joe_jackson_tickets_cleaned.csv'
SCANS_DIR = './scans'

def load_data(filepath):
    if not os.path.exists(filepath):
        print(f"❌ File {filepath} was not found in the current directory!")
        return None
    with open(filepath, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        return list(reader)

def check_unique_ids(records):
    print("\n1. Checking ID_MEMORABILIA uniqueness...")
    seen = set()
    duplicates = set()
    for row in records:
        memo_id = row.get('ID_MEMORABILIA', '').strip()
        if memo_id:
            if memo_id in seen:
                duplicates.add(memo_id)
            else:
                seen.add(memo_id)
    if duplicates:
        print(f"❌ Duplicate ID_MEMORABILIA values found: {list(duplicates)}")
        return False
    print("✅ All ID_MEMORABILIA values are unique.")
    return True

def check_dates(records):
    print("\n2. Checking date format (YYYY-MM-DD)...")
    date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    invalid_dates = []
    for row in records:
        datum = row.get('DATUM', '').strip()
        memo_id = row.get('ID_MEMORABILIA', '')
        if not date_pattern.match(datum):
            invalid_dates.append((memo_id, datum))
    
    if invalid_dates:
        print(f"❌ Invalid date formats ({len(invalid_dates)} records):")
        for memo_id, datum in invalid_dates:
            print(f"   - {memo_id}: '{datum}'")
        return False
    print("✅ All dates have valid YYYY-MM-DD format.")
    return True

def check_song_counts(records):
    print("\n3. Checking song counts (POCET_SKLADEB vs SETLIST)...")
    mismatches = []
    for row in records:
        memo_id = row.get('ID_MEMORABILIA', '')
        setlist_str = row.get('SETLIST', '').strip()
        try:
            stored_count = int(row.get('POCET_SKLADEB', 0) or 0)
        except ValueError:
            stored_count = 0
            
        songs = [s.strip() for s in setlist_str.split(',') if s.strip()] if setlist_str else []
        actual_count = len(songs)
        
        if stored_count != actual_count:
            mismatches.append((memo_id, stored_count, actual_count))

    if mismatches:
        print(f"⚠️ Mismatched song counts ({len(mismatches)} records):")
        for memo_id, count, actual in mismatches[:10]:
            print(f"   - {memo_id}: stored {count}, counted in setlist {actual}")
        if len(mismatches) > 10:
            print(f"   ... and {len(mismatches) - 10} more records.")
        return False
    print("✅ Song count matches setlist items.")
    return True

def check_scan_files(records, scans_dir):
    print(f"\n4. Checking scan file existence in '{scans_dir}'...")
    if not os.path.exists(scans_dir):
        print(f"ℹ️ Directory '{scans_dir}' does not exist locally, skipping local file check.")
        return True

    missing_files = []
    for row in records:
        memo_id = row.get('ID_MEMORABILIA', '')
        scans_str = row.get('SOUBOR_SKEN', '')
        scans = scans_str.split(',') if scans_str else []
        for s in scans:
            s_clean = s.strip()
            if s_clean and not os.path.exists(os.path.join(scans_dir, s_clean)):
                missing_files.append((memo_id, s_clean))

    if missing_files:
        print(f"❌ Missing scan files ({len(missing_files)} missing):")
        for memo_id, filename in missing_files[:10]:
            print(f"   - {memo_id}: {filename}")
        if len(missing_files) > 10:
            print(f"   ... and {len(missing_files) - 10} more files.")
        return False
    print("✅ All scan files exist in /scans/ directory.")
    return True

def check_youtube_links(records):
    print("\n5. Checking YouTube links...")
    yt_records = [r for r in records if r.get('YOUTUBE_URL', '').strip()]
    
    if not yt_records:
        print("ℹ️ No YouTube links to verify.")
        return True

    broken_count = 0
    total = len(yt_records)
    print(f"Verifying {total} links via YouTube oEmbed API...")

    for row in yt_records:
        url = row.get('YOUTUBE_URL', '').strip()
        memo_id = row.get('ID_MEMORABILIA', '')
        oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status != 200:
                    print(f"   ⚠️ [{memo_id}] Inactive video: {url}")
                    broken_count += 1
        except urllib.error.HTTPError as e:
            print(f"   ❌ [{memo_id}] Broken / deleted video (HTTP {e.code}): {url}")
            broken_count += 1
        except Exception as e:
            print(f"   ❌ [{memo_id}] Connection error for video: {url} ({e})")
            broken_count += 1

    if broken_count == 0:
        print(f"✅ All {total} YouTube links are fully functional.")
        return True
    else:
        print(f"⚠️ Found {broken_count} broken links out of {total}.")
        return False

def main():
    print(f"=== RUNNING DATABASE CHECK ({CSV_FILE}) ===")
    records = load_data(CSV_FILE)
    if records is None:
        return

    print(f"Loaded {len(records)} total records.")

    check_unique_ids(records)
    check_dates(records)
    check_song_counts(records)
    check_scan_files(records, SCANS_DIR)
    check_youtube_links(records)

    print("\n=== CHECK COMPLETED ===")

if __name__ == '__main__':
    main()
