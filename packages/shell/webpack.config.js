const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

const deps = require('./package.json').dependencies;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  // Use environment variable or default to localhost for browser access
  const syntheaCoreUrl = process.env.SYNTHEA_CORE_URL || 'http://localhost:3002/remoteEntry.js';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index',
    devtool: isProduction ? 'source-map' : 'inline-source-map',

    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: 'http://localhost:3001/',
      clean: true,
      filename: '[name].[contenthash].js',
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },

    plugins: [
      new ModuleFederationPlugin({
        name: 'syntheaShell',
        remotes: {
          syntheaCore: `syntheaCore@${syntheaCoreUrl}`,
        },
        shared: {
          ...deps,
          react: {
            singleton: true,
            requiredVersion: deps.react,
            eager: false,
            strictVersion: false,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: deps['react-dom'],
            eager: false,
            strictVersion: false,
          },
          'react-router-dom': {
            singleton: true,
            requiredVersion: deps['react-router-dom'],
            eager: false,
            strictVersion: false,
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: deps['@tanstack/react-query'],
            eager: false,
            strictVersion: false,
          },
        },
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'Synthea Studio',
      }),
    ],

    devServer: {
      port: 3001,
      hot: true,
      allowedHosts: 'all',
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  };
};