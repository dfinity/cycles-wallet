const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const { DefinePlugin } = require("webpack");

const prodConfig = require("./webpack.config");
module.exports = {
  ...prodConfig,
  mode: "development",
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
  module: {
    ...prodConfig.module,
    rules: [...prodConfig.module.rules],
  },
  plugins: [
    ...prodConfig.plugins,
    new DefinePlugin({
      "process.browser": true,
      "process.env.NODE_DEBUG": false,
    }),
  ],
  devServer: {
    port: 8080,
    watchFiles: "./wallet_ui",
    hot: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/bls.wasm": "http://localhost:8000",
    },
    historyApiFallback: {
      index: "/",
    },
  },
};
