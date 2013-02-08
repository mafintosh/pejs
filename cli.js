#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var pejs = require('./index');

var tree = process.argv.indexOf('--tree') > -1 || process.argv.indexOf('-t') > -1;
var filenames = process.argv.slice(2).filter(function(filename, i, filenames) {
	return filename[0] !== '-' && (filenames[i-1] || '')[0] !== '-';
});

if (!filenames.length) {
	console.error('usage: pejs filename1, filename2, ...');
	process.exit(1);
}
if (filenames.length > 1 && tree) {
	console.error('multiple input files is not supported with --tree');
	process.exit(1);
}

filenames.forEach(function(filename) {
	if (!fs.existsSync(filename)) {
		console.error(filename+' does not exist');
		process.exit(2);
	}
});

filenames = filenames.map(fs.realpathSync);

if (tree) {
	pejs.tree(filenames[0], function(err, tree) {
		if (err) {
			console.error(err.message);
			process.exit(3);
		}
		console.log(JSON.stringify(tree));
	});
	return;
}


var once = true;
filenames.forEach(function(filename) {
	var exports = filenames.length > 1 && path.basename(filename).slice(0, -path.extname(filename).length);

	pejs.parse(filename, {exports:exports}, function(err, src) {
		if (err) {
			console.error(err.message);
			process.exit(3);
		}
		if (!once) src = src.replace(pejs.ESCAPE_SOURCE, '');
		once = false;
		console.log(src);
	});
});
