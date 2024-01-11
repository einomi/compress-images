# compress-images

A simple script for converting jpeg and png files to avif, webp and compressing the original files. 

All are images converted and compressed using `sharp` library. The .png files are compressed using `imagemin` library as it works better than `sharp` for pngs.

## Installation

`npm install`

## Compressing images

Simply put your images to `images/` folder and run `npm run compress-images`. After that, you should get the compressed images in the same directory.

## Changing settings

Feel free to change image quality settings or any other settings that you need in `scripts/compress-images.js`.
