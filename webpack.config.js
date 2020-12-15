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
      { test: /\.[jt]sx?$/, loader: "ts-loader" },
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
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    fallback: {
      fs: false,
      path: false,
    },
  },
  optimization: {
    // minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          ecma: 8,
          // comments: false,
          // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        },
      }),
    ],
  },
  devServer: {
    contentBase: dist,
    compress: true,
    port: 9000,
  },
};
