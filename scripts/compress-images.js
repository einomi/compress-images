const fs = require("fs");
const path = require("path");

const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const sharp = require("sharp");

const dir = path.resolve("./images/");

const pngOptions = {
  quality: [0.5, 0.7],
};

const jpegOptions = { quality: 45 };

const avifOptions = {
  quality: 63,
  effort: 7,
  chromaSubsampling: "4:2:0",
};

const webpOptions = {
  quality: 75,
  alphaQuality: 75,
  speed: 8,
  chromaSubsampling: "4:2:0",
};

/** @param {string} filename */
function getExtension(filename) {
  return filename.split(".").slice(-1)[0];
}

/** @param {string} pathStr */
function getPathWithoutExtension(pathStr) {
  return pathStr.split(".").slice(0, -1).join(".");
}

function main() {
  fs.readdir(dir, (error, filenames) => {
    if (error) {
      return;
    }
    filenames
      .map((filename) => {
        if (["avif", "webp"].includes(getExtension(filename))) {
          fs.unlink(`${dir}/${filename}`, () => {
            console.info(`${filename} has been deleted`);
          });
          return "";
        }
        return filename;
      })
      .filter((filename) => {
        return ["jpeg", "png", "jpg"].includes(getExtension(filename));
      })
      .forEach((filename) => {
        const extension = getExtension(filename);
        sharp(path.join(dir, filename))
          .toFormat("avif")
          .avif(avifOptions)
          .toFile(`${dir}/${getPathWithoutExtension(filename)}.avif`);
        sharp(path.join(dir, filename))
          .toFormat("webp")
          .webp(webpOptions)
          .toFile(`${dir}/${getPathWithoutExtension(filename)}.webp`);
        if (["jpg", "jpeg"].includes(extension)) {
          sharp(path.join(dir, filename))
            .jpeg(jpegOptions)
            .toBuffer((err, buffer) => {
              if (err) {
                throw new Error(err.message);
              }
              // eslint-disable-next-line max-nested-callbacks
              fs.writeFile(`${dir}/${filename}`, buffer, (writeErr) => {
                if (writeErr) {
                  throw new Error(writeErr.message);
                }
              });
            });
        }
      });
  });

  // Optimizing .png files
  imagemin([`${dir}/**/*.png`], {
    destination: dir,
    plugins: [imageminPngquant(pngOptions)],
  });
}

main();
