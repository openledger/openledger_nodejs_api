'use strict';
const NODE_ENV = process.env.NODE_ENV || 'development';
const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');

function CreateWebpackConfig(type) {
    let folder = (type == 'js' ? 'scripts' : 'assets');
    let ext = (type == 'js' ? 'js' : 'css');
    this.entry = {
        home: path.join(__dirname, folder, 'home')
    };
    
    //custom files input
    if (type == 'js') {
        //this.entry['test'] = path.join(__dirname, folder, 'test');
        this.entry['pass'] = path.join(__dirname, folder, 'pass');
    } else if (type == 'scss') {
        //this.entry['filename'] = path.join(__dirname,  folder, 'filename');
    }

    this.output = {
        filename: '[name].' + ext,
        path: path.join(__dirname, 'bundle'),
        publicPath: ''
    }; //publicPath !!

    let outputfile = path.join(this.output.path,`home.${ext}`);

    this.resolve = {
        extensions: ['']
    };

    this.resolve.extensions.push(`.${type}`);

    this.module = {
        loaders: [{
                test: /\.(jpe?g|png|gif|svg|ttf|eot|woff|woff2)$/i,
                loader: (type == 'js' ? 'ignore-loader' : 'file?name=[path][name].[ext]')
            }, {
                test: /\.json/,
                loader: "json"
            },
            (() => {
                if (type == 'js') {
                    return {
                        test: /\.js$/,
                        exclude: /(node_modules|bower_components)/,
                        loader: 'babel',
                        query: {
                            presets: ["es2015", "stage-0"],
                            plugins: ['transform-runtime']
                        }
                    };
                } else if (type == 'scss') {
                    return {
                        test: /\.scss$/,
                        loader: ExtractTextPlugin.extract('style-loader', 'css-loader?sourceMap!sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true')
                    };
                }
            })()
        ]
    };

    this.plugins = [
        new ExtractTextPlugin('[name].css'),
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify(NODE_ENV)
        }),
        function(){
            this.plugin("done", function(stats) {
                if (stats.compilation.errors && stats.compilation.errors.length) {
                    console.log(stats.compilation.errors[0].error);                 
                    if (fs.existsSync(outputfile)){
                        fs.unlinkSync(outputfile);
                    }
                }

            });
        }
    ];

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
    new CreateWebpackConfig('scss')
];