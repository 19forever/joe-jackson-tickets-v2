#!/usr/bin/env python3
"""
Joe Jackson Memorabilia Museum - Batch Scan Watermarking Script
Automatically inserts the discrete visible watermark "JJ Memorabilia Museum"
into ticket, poster, and program scans in the /scans/ directory.

Usage:
    python watermark_scans.py [--input ./scans] [--output ./scans_watermarked] [--position bottom-right]
"""

import os
import sys
import argparse

WATERMARK_TEXT = "JJ Memorabilia Museum"
SUBTEXT = "Joe Jackson Archive • joejackson.band"

def process_scans_pillow(input_dir, output_dir, position):
    from PIL import Image, ImageDraw, ImageFont

    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    supported_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    files = [f for f in os.listdir(input_dir) if f.lower().endswith(supported_extensions)]

    if not files:
        print(f"ℹ️ No image files found in {input_dir}")
        return

    print(f"✨ Found {len(files)} scan files in {input_dir}")
    print(f"🏷️ Applying watermark: '{WATERMARK_TEXT}'\n")

    success_count = 0

    for idx, fname in enumerate(files, start=1):
        in_path = os.path.join(input_dir, fname)
        out_path = os.path.join(output_dir, fname)

        try:
            with Image.open(in_path) as img:
                img = img.convert('RGB')
                w, h = img.size

                # Scale overlay size according to image dimensions
                scale = max(w, h) / 1200.0
                font_size = max(16, int(22 * scale))
                sub_font_size = max(10, int(12 * scale))
                padding_x = max(12, int(16 * scale))
                padding_y = max(8, int(12 * scale))
                margin = max(12, int(20 * scale))

                # Try loading font or default
                try:
                    font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
                    sub_font = ImageFont.truetype("DejaVuSans.ttf", sub_font_size)
                except IOError:
                    font = ImageFont.load_default()
                    sub_font = ImageFont.load_default()

                # Measure box
                dummy_draw = ImageDraw.Draw(img)
                main_bbox = dummy_draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
                sub_bbox = dummy_draw.textbbox((0, 0), SUBTEXT, font=sub_font)

                main_w = main_bbox[2] - main_bbox[0]
                main_h = main_bbox[3] - main_bbox[1]
                sub_w = sub_bbox[2] - sub_bbox[0]
                sub_h = sub_bbox[3] - sub_bbox[1]

                content_w = max(main_w, sub_w)
                box_w = content_w + (padding_x * 2) + int(24 * scale)
                box_h = main_h + sub_h + (padding_y * 2) + int(6 * scale)

                # Coordinates
                if position == 'bottom-right':
                    x = w - box_w - margin
                    y = h - box_h - margin
                elif position == 'bottom-left':
                    x = margin
                    y = h - box_h - margin
                else:
                    x = (w - box_w) // 2
                    y = (h - box_h) // 2

                # Overlay layer for semi-transparent background
                overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
                draw = ImageDraw.Draw(overlay)

                # Translucent dark pill background
                rect_coords = [x, y, x + box_w, y + box_h]
                draw.rounded_rectangle(rect_coords, radius=int(8 * scale), fill=(15, 23, 42, 195), outline=(255, 255, 255, 60), width=max(1, int(1.5 * scale)))

                # Text positioning
                text_x = x + padding_x + int(24 * scale)
                text_y = y + padding_y

                # Draw Main Title
                draw.text((text_x, text_y), WATERMARK_TEXT, fill=(255, 255, 255, 255), font=font)
                # Draw Subtitle
                draw.text((text_x, text_y + main_h + int(4 * scale)), SUBTEXT, fill=(220, 225, 235, 220), font=sub_font)
                # Badge symbol
                draw.text((x + padding_x, text_y), "Ticket", fill=(245, 158, 11, 255), font=sub_font)

                # Composite
                img = img.convert('RGBA')
                watermarked = Image.alpha_composite(img, overlay).convert('RGB')
                watermarked.save(out_path, quality=92)
                success_count += 1
                print(f"  [{idx}/{len(files)}] ✅ Watermarked: {fname} -> {out_path}")

        except Exception as e:
            print(f"  [{idx}/{len(files)}] ❌ Error processing {fname}: {e}")

    print(f"\n🎉 Successfully processed {success_count}/{len(files)} scan files.")

def main():
    parser = argparse.ArgumentParser(description="Watermark Joe Jackson Memorabilia Scans")
    parser.add_argument("--input", default="./scans", help="Input directory containing scan images")
    parser.add_argument("--output", default="./scans_watermarked", help="Output directory for watermarked scans")
    parser.add_argument("--position", default="bottom-right", choices=["bottom-right", "bottom-left", "center"], help="Watermark position")

    args = parser.parse_args()

    try:
        import PIL
        process_scans_pillow(args.input, args.output, args.position)
    except ImportError:
        print("⚠️ Python Pillow library is not installed.")
        print("💡 Use the built-in browser watermarking tool in 'ticket_form.html' or 'edit_ticket_new.html'!")
        print("   To run CLI watermarking via Python: pip install pillow")

if __name__ == "__main__":
    main()
