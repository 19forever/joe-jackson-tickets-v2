import os
import sys

def watermark_scans(directory='scans'):
    print(f"🖼️ Checking scan watermark directory: {directory}")
    if not os.path.exists(directory):
        print(f"Directory {directory} does not exist.")
        return
    
    files = [f for f in os.listdir(directory) if f.endswith(('.jpg', '.png', '.svg', '.webp'))]
    print(f"Found {len(files)} scan files in '{directory}'. Watermarking ready.")

if __name__ == "__main__":
    dir_arg = sys.argv[1] if len(sys.argv) > 1 else 'scans'
    watermark_scans(dir_arg)
