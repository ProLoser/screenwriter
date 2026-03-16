#!/usr/bin/env node
// Unified build script: bundles JS/JSX + SCSS + Bootstrap CSS via esbuild.
// Outputs:
//   script.js   – JavaScript bundle
//   script.css  – CSS bundle (Bootstrap + app styles + print styles)

const esbuild = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');

esbuild.build({
	entryPoints: ['script.jsx'],
	bundle: true,
	outfile: 'script.js',
	platform: 'browser',
	jsx: 'automatic',
	plugins: [sassPlugin()],
	loader: {
		'.eot': 'file',
		'.ttf': 'file',
		'.woff': 'file',
		'.woff2': 'file',
		'.svg': 'file',
	},
	assetNames: 'fonts/[name]-[hash]',
	logLevel: 'info',
}).catch(function() { process.exit(1); });
