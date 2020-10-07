const webpack = require('webpack');
const path = require('path');

// Generate webpack configuration.
module.exports = {
  entry: path.join(__dirname, 'wallet_ui/index.tsx'),
  mode: 'production',
  module: {
    rules: [
      { test: /\.(ts)x?$/, loader: "ts-loader" },
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
    path: path.join(__dirname, 'dist'),
  },
  resolve: {
    extensions: [ '.js', '.jsx', '.ts', '.tsx' ]
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      'CANISTER_ID': process.env.CANISTER_ID,
      DEBUG: false
    })
  ],
};
