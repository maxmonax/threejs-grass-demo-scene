const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = merge(common, {
    mode: 'production',
    resolve: {
        plugins: [new TsconfigPathsPlugin({
            baseUrl: __dirname,
            configFile: path.join(__dirname, 'tsconfig.prod.json')
        })]
    }
});