# Watercolor

[![build](https://github.com/remarkablemark/watercolor/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablemark/watercolor/actions/workflows/build.yml)
[![test](https://github.com/remarkablemark/watercolor/actions/workflows/test.yml/badge.svg)](https://github.com/remarkablemark/watercolor/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/remarkablemark/watercolor/graph/badge.svg?token=Fnhl2pBxpd)](https://codecov.io/gh/remarkablemark/watercolor)

🎨 Turn any image into watercolor art. Upload an image, adjust the effects, and download your watercolor creation:

- [Watercolor](https://remarkablemark.org/watercolor/)

## Features

- **Upload** an image with the file picker, drag-and-drop, or a clipboard paste.
- **Presets**: Loose, Wet-on-wet, Sketch, and Posterized.
- **Controls**: blur, saturation, quantize step, and paper texture. The preview updates live, then sharpens to full resolution when you stop.
- **Preview** the before/after image. Drag the slider or focus it and use the arrow keys.
- **Download** as PNG, JPEG, or WebP.
- **Large images** are handled at a reduced scale first, with the full render capped at 24 megapixels.
- **Private** and local: everything runs client-side in the browser and nothing is uploaded to a server.

## Install

Clone the repository:

```sh
git clone https://github.com/remarkablemark/watercolor.git
cd watercolor
```

Install the dependencies:

```sh
npm install
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) to view it in the browser.

The page will reload if you make edits.

You will also see any errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder.

It correctly bundles in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

Your app is ready to be deployed!

### `npm run lint`

Checks the code quality.

### `npm run lint:tsc`

Checks for type errors.

### `npm test`

Runs the tests.

## License

[MIT](LICENSE)
