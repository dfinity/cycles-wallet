/**
 * Module     : webpack.config.js
 * Copyright  : Enzo Haussecker
 * License    : Apache 2.0 with LLVM Exception
 * Maintainer : Enzo Haussecker <enzo@dfinity.org>
 * Stability  : Stable
 */

const Config = require('./dfx.json');
const Path = require('path');

// Identify build output directory.
const output = ['defaults', 'build', 'output'].reduce((accum, x) => {
  return accum && accum[x] ? accum[x] : null;
}, Config) || Path.join('.dfx', 'local', 'canisters');

// Identify canisters aliases.
const aliases = Object.entries(Config.canisters).reduce((accum, [name,]) => {
  const outputRoot = Path.join(__dirname, output, name);
  return {
    ...accum,
    ['ic:canisters/' + name]: Path.join(outputRoot, name + '.js'),
    ['ic:idl/' + name]: Path.join(outputRoot, name + '.did.js'),
  };
}, {});

// Generate webpack configuration.
const generate = (name, info) => {
  if (typeof info.frontend !== 'object') {
    return;
  };
  const inputRoot = __dirname;
  const outputRoot = Path.join(__dirname, output, name);
  return {
    entry: Path.join(inputRoot, info.frontend.entrypoint),
    mode: 'production',
    module: {
      rules: [
        { test: /\.(ts)x?$/, loader: "ts-loader" },
        {
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-react',
            ],
          },
          test: /\.(js|jsx)$/,
        },
        {
          exclude: /node_modules/,
          loader: [
            'style-loader',
            'css-loader',
          ],
          test: /\.css$/,
        },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'url-loader'
          }
        ],
      }
    ]
  },
    output: {
      filename: 'index.js',
      path: Path.join(outputRoot, 'assets'),
    },
    resolve: {
      alias: aliases,
      extensions: [ '.js', '.jsx', '.ts', '.tsx' ]
    }
  };
};

module.exports = [
  ...Object.entries(Config.canisters).map(([name, info]) => {
    return generate(name, info);
  }).filter(x => !!x),
];
