const fs = require('fs');
const path = require('path');

const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const sharp = require('sharp');

const dir = path.resolve('./images/');

const pngOptions = {
  quality: [0.5, 0.7],
};

const POSSIBLE_EXTENSIONS = ['png', 'jpeg', 'jpg'];

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

/** @param {string} filename */
function getExtension(filename) {
  return filename.split('.').slice(-1)[0];
}

/** @param {string} pathStr */
function getPathWithoutExtension(pathStr) {
  return pathStr.split('.').slice(0, -1).join('.');
}

async function main() {
  const filenames = fs
    .readdirSync(dir)
    .filter((filename) =>
      POSSIBLE_EXTENSIONS.find((extension) => filename.endsWith(extension))
    );

  console.log('filenames', filenames);

  console.info('Files total:', filenames.length);

  const promiseArray = [];

  filenames
    .map((filename) => {
      if (['avif', 'webp'].includes(getExtension(filename))) {
        fs.unlink(`${dir}/${filename}`, () => {
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
      const promiseAvif = sharp(path.join(dir, filename))
        .toFormat('avif')
        .resize(width)
        .avif(avifOptions)
        .toFile(`${dir}/${getPathWithoutExtension(filename)}.avif`);

      // convert to webp
      const promiseWebp = sharp(path.join(dir, filename))
        .toFormat('webp')
        .resize(width)
        .webp(webpOptions)
        .toFile(`${dir}/${getPathWithoutExtension(filename)}.webp`);

      promiseArray.push(promiseAvif, promiseWebp);

      // resize and compress jpeg files
      if (/^jpe?g$/.test(extension)) {
          console.log('detected jpeg');
        const promiseJpeg = new Promise((resolve, reject) => {
          sharp(path.join(dir, filename))
            .resize(width)
            .jpeg(jpegOptions)
            .toBuffer((err, buffer) => {
              if (err) {
                throw new Error(err.message);
              }
              // eslint-disable-next-line max-nested-callbacks
              fs.writeFile(`${dir}/${filename}`, buffer, (writeErr) => {
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
          sharp(path.join(dir, filename))
            .resize(width)
            .png()
            .toBuffer((err, buffer) => {
              if (err) {
                console.log('err.message', err.message);
                reject(err.message);
              }
              // eslint-disable-next-line max-nested-callbacks
              fs.writeFile(path.join(dir, filename), buffer, (writeErr) => {
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

  console.info('Now compressing pngs');

  // optimizing .png files
  await imagemin([`${dir}/**/*.png`], {
    destination: dir,
    plugins: [imageminPngquant(pngOptions)],
  });
}

main();
