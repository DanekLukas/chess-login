const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
module.exports = {
  entry: './src/index.tsx',
  target: 'web',
  mode: 'production',
  output: {
    path: path.resolve('./', 'dist'),
    filename: 'peer.js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            compact: false,
            // The configration for compilation
            presets: [
              ['module:metro-react-native-babel-preset'], // Add this line,
              [require.resolve('babel-preset-react-app/dependencies'), { helpers: true }],
            ],
            cacheDirectory: true,
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-object-rest-spread',
              [
                'module-resolver',
                {
                  alias: {
                    '^react-native$': 'react-native-web',
                  },
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
      },
      // {
      //   enforce: "pre",
      //   test: /\.js$/,
      //   loader: "source-map-loader",
      // },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      // {
      //   test: /\.svg$/,
      //   use: ['@svgr/webpack', 'url-loader'],
      // },
    ],
  },
}
