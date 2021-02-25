const prodConfig = require("./webpack.config");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

const public = path.join(__dirname, "wallet_ui", "public");

module.exports = {
  ...prodConfig,
  entry: path.join(__dirname, "wallet_ui/index.development.jsx"),
  output: {
    filename: "index.js",
    path: public,
  },
  mode: "development",
  module: {
    ...prodConfig.module,
    rules: [
      ...prodConfig.module.rules,
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(public, "index.html"),
    }),
  ],
  devServer: {
    port: 3000,
    contentBase: "./wallet_ui",
    hot: true,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  optimization: {
    minimize: false,
  },
};
