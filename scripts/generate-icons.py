#!/usr/bin/env python3
"""Generate PWA icons (192x192, 512x512) from the logo."""
from PIL import Image, ImageDraw
import os

SRC = '/home/z/my-project/public/logo.png'
OUT_192 = '/home/z/my-project/public/icon-192.png'
OUT_512 = '/home/z/my-project/public/icon-512.png'

def create_icon(size, out_path):
    """Create a PWA icon with a gradient background and the logo centered."""
    # Create a new image with a gradient-like background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a rounded square background with P2PEX brand colors (yellow to orange gradient)
    # We'll use a solid color for simplicity, then overlay the logo
    bg_color = (245, 158, 11, 255)  # amber-500
    
    # Draw rounded rectangle background
    radius = size // 6
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill=bg_color)
    
    # Try to open and paste the logo
    try:
        logo = Image.open(SRC).convert('RGBA')
        # Resize logo to fit inside the icon (70% of the icon size)
        logo_size = int(size * 0.7)
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        
        # Center the logo
        offset = ((size - logo_size) // 2, (size - logo_size) // 2)
        img.paste(logo, offset, logo)
    except Exception as e:
        print(f"Warning: Could not load logo, using text instead: {e}")
        # If logo fails, draw "P2P" text
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size // 3)
            text = "P2P"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            x = (size - text_w) // 2
            y = (size - text_h) // 2
            draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
        except:
            pass
    
    # Save
    img.save(out_path, 'PNG')
    print(f"Created: {out_path} ({size}x{size})")

create_icon(192, OUT_192)
create_icon(512, OUT_512)
print("Done!")
