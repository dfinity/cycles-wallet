const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

const dist = path.join(__dirname, "dist");

module.exports = {
  entry: path.join(__dirname, "wallet_ui/index.tsx"),
  output: {
    filename: "index.js",
    path: dist,
  },
  mode: "production",
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        exclude: /node_modules/,
        test: /\.css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: "url-loader",
          },
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.[tj]s(\?.*)?$/i,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    fallback: {
      "assert": require.resolve("assert/"),
      "buffer": require.resolve("buffer/"),
      "events": require.resolve("events/"),
      "stream": require.resolve("stream-browserify/"),
      "util": require.resolve("util/"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer'],
      process: require.resolve('process/browser'),
    }),
  ]
};
