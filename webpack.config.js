const path = require("path");

module.exports = {
  entry: path.join(__dirname, "wallet_ui/index.tsx"),
  output: {
    filename: "index.js",
    path: path.join(__dirname, "dist"),
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
};
