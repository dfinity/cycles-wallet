const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

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
      { test: /\.(jsx|tsx?)$/, loader: "ts-loader" },
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
      fs: false,
      path: false,
    },
  },
};
