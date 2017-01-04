'use strict';
const NODE_ENV = process.env.NODE_ENV || 'development';
const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');

function CreateWebpackConfig(type) {
    let folder = (type == 'js' ? 'scripts' : 'assets');
    let ext = (type == 'js' && 'js' || type == 'scss' && 'css' || type == 'html' && 'html');

    this.entry = {
        index: path.join(__dirname, folder, 'index')
    };
    //custom files input
    if (type == 'js') {
        this.entry['pass'] = path.join(__dirname, folder, 'pass');
    } else if (type == 'scss') {
        //this.entry['file1'] = path.join(__dirname, folder, 'file1');
    } else if (type == 'html') {
        //this.entry['file2'] = path.join(__dirname, folder, 'file2');
    }

    this.output = {
        filename: '[name].' + ext,
        path: path.join(__dirname, 'bundle'),
        publicPath: ''
    }; //publicPath !!

    let outputfile = path.join(this.output.path, `index.${ext}`);

    this.resolve = {
        extensions: ['']
    };

    this.resolve.extensions.push(`.${type}`);

    this.module = {
        loaders: []
    };

    if (type == 'js') {

        this.module.loaders.push({
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            loader: 'babel',
            query: {
                presets: ["es2015", "stage-0"],
                plugins: ['transform-runtime']
            }
        });
        
        this.module.loaders.push({
            test: /\.json/,
            loader: "json"
        });

    } else if (type == 'scss') {

        this.module.loaders.push({
            test: /\.scss$/,
            loader: ExtractTextPlugin.extract('style-loader', 'css-loader?sourceMap!sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true')
        });

        this.module.loaders.push({
            test: /\.(jpe?g|png|gif|svg|ttf|eot|woff|woff2)$/i,
            loader: 'file?name=[path][name].[ext]'
        });

    } else if (type == 'html') {
        
        this.module.loaders.push({
            test: /\.html$/,
            loader: ExtractTextPlugin.extract('html?minimize=true')
        });
    }

    this.plugins = [
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify(NODE_ENV)
        }),
        new webpack.NoErrorsPlugin(),
        function() {
            this.plugin("done", function(stats) {
                if (stats.compilation.errors && stats.compilation.errors.length) {
                    console.log(stats.compilation.errors[0].error);
                    if (fs.existsSync(outputfile)) {
                        fs.writeFileSync(outputfile, JSON.stringify(stats.compilation.errors[0].error.details), 'utf8');
                    }
                }
            });
        }
    ];

    if (type == 'scss' || type == 'html') {
        this.plugins.push(new ExtractTextPlugin(`[name].${ext}`))
    }

    this.devtool = (NODE_ENV == 'development' ? "inline-source-map" : '');

    if (NODE_ENV == 'production') {
        this.plugins.push(new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            comments: false,
            compress: {
                sequences: true,
                booleans: true,
                loops: true,
                unused: true,
                warnings: false,
                drop_console: true,
                unsafe: true
            }
        }));
        this.plugins.push(new webpack.optimize.DedupePlugin());
    }
}

module.exports = [
    new CreateWebpackConfig('js'),
    new CreateWebpackConfig('scss'),
    new CreateWebpackConfig('html')
];