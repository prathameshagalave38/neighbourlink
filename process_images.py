
from PIL import Image
import os

def make_transparent_and_crop(filepath):
    if not os.path.exists(filepath):
        return
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()
    newData = []
    # Replace white with transparent
    for item in datas:
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    
    # Crop empty transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(filepath, "PNG")

make_transparent_and_crop("public/logo.png")
make_transparent_and_crop("public/favicon.jpg")
print("Images processed successfully")

