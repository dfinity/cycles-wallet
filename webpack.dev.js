const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const { DefinePlugin } = require("webpack");
const public = path.join(__dirname, "wallet_ui", "public");

const prodConfig = require("./webpack.config");
module.exports = {
  ...prodConfig,
  output: {
    filename: "index.js",
    path: public,
  },
  mode: "development",
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
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
    ...prodConfig.plugins,
    new HtmlWebpackPlugin({
      template: path.join(public, "index.html"),
    }),
    new DefinePlugin({
      "process.browser": true,
      "process.env.NODE_DEBUG": false,
    }),
  ],
  devServer: {
    port: 8080,
    contentBase: "./wallet_ui",
    hot: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/bls.wasm": "http://localhost:8000",
    },
  },
};
