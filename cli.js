#!/usr/bin/env node

var fs = require('fs');
var pejs = require('./index');

var filename = process.argv[2];

if (!filename || filename[0] === '-') {
	console.error('usage: pejs filename');
	process.exit(1);
}

if (!fs.existsSync(filename)) {
	console.error(filename+' does not exist');
	process.exit(2);
}

var tree = process.argv.indexOf('--tree') > -1 || process.argv.indexOf('-t') > -1;

filename = fs.realpathSync(filename);

if (tree) {
	pejs.tree(filename, function(err, tree) {
		if (err) {
			console.error(err.message);
			process.exit(3);
		}
		console.log(JSON.stringify(tree));
	});
}

pejs.parse(filename, function(err, src) {
	if (err) {
		console.error(err.message);
		process.exit(3);
	}
	console.log(src);
});