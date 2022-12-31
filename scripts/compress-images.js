const fs = require('fs');
const path = require('path');

const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const sharp = require('sharp');

const DIRECTORY = path.resolve('./images/');
const POSSIBLE_EXTENSIONS = ['png', 'jpeg', 'jpg'];

/***************************
*
*  Image Quality Settings
*
***************************/

const pngOptions = {
  quality: [0.5, 0.7],
};

const jpegOptions = { quality: 60 };

const avifOptions = {
  quality: 55,
  effort: 5,
  chromaSubsampling: '4:2:0',
};

const webpOptions = {
  quality: 65,
  alphaQuality: 77,
  effort: 4,
  chromaSubsampling: '4:2:0',
};

/*********************
*
*  Helper Functions
*
**********************/

/** @param {string} filename */
function getExtension(filename) {
  return filename.split('.').slice(-1)[0];
}

/** @param {string} pathStr */
function getPathWithoutExtension(pathStr) {
  return pathStr.split('.').slice(0, -1).join('.');
}

/*************************
*
*  Compress Images Script
*
**************************/

async function main() {
  const filenames = fs
    .readdirSync(DIRECTORY)
    .filter((filename) =>
      POSSIBLE_EXTENSIONS.find((extension) => filename.endsWith(extension))
    );

  console.info('Files total:', filenames.length);

  console.info('Converting to .avif, .webp and compressing jpeg images...');

  const promiseArray = [];

  filenames
    .map((filename) => {
      if (['avif', 'webp'].includes(getExtension(filename))) {
        fs.unlink(`${DIRECTORY}/${filename}`, () => {
          console.info(`${filename} has been deleted`);
        });
        return '';
      }
      return filename;
    })
    .forEach((filename) => {
      const extension = getExtension(filename);
      const width = undefined; // set width if you want to resize

      // convert to avif
      const promiseAvif = sharp(path.join(DIRECTORY, filename))
        .toFormat('avif')
        .resize(width)
        .avif(avifOptions)
        .toFile(`${DIRECTORY}/${getPathWithoutExtension(filename)}.avif`);

      // convert to webp
      const promiseWebp = sharp(path.join(DIRECTORY, filename))
        .toFormat('webp')
        .resize(width)
        .webp(webpOptions)
        .toFile(`${DIRECTORY}/${getPathWithoutExtension(filename)}.webp`);

      promiseArray.push(promiseAvif, promiseWebp);

      // resize and compress jpeg files
      if (/^jpe?g$/.test(extension)) {
        const promiseJpeg = new Promise((resolve, reject) => {
          sharp(path.join(DIRECTORY, filename))
            .resize(width)
            .jpeg(jpegOptions)
            .toBuffer((err, buffer) => {
              if (err) {
                throw new Error(err.message);
              }
              // eslint-disable-next-line max-nested-callbacks
              fs.writeFile(`${DIRECTORY}/${filename}`, buffer, (writeErr) => {
                if (writeErr) {
                  reject(writeErr.message);
                } else {
                  resolve();
                }
              });
            });
        });

        promiseArray.push(promiseJpeg);
      }

      // only resize for png files, we are compressing them later
      // in this script by imagemin (better results than by sharp)
      if (extension === 'png' && width) {
        const promisePng = new Promise((resolve, reject) => {
          sharp(path.join(DIRECTORY, filename))
            .resize(width)
            .png()
            .toBuffer((err, buffer) => {
              if (err) {
                console.log('err.message', err.message);
                reject(err.message);
              }
              // eslint-disable-next-line max-nested-callbacks
              fs.writeFile(path.join(DIRECTORY, filename), buffer, (writeErr) => {
                if (writeErr) {
                  console.log('writeErr', writeErr);
                  reject(writeErr.message);
                } else {
                  resolve();
                }
              });
            });
        });

        promiseArray.push(promisePng);
      }
    });

  await Promise.all(promiseArray);

  console.info('Now compressing .png files...');

  // optimizing .png files
  await imagemin([`${DIRECTORY}/**/*.png`], {
    destination: DIRECTORY,
    plugins: [imageminPngquant(pngOptions)],
  });

  console.info('Done!');
}

main();
