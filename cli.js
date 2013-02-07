#!/usr/bin/env node

var fs = require('fs');
var pejs = require('./index');

var tree = process.argv.indexOf('--tree') > -1 || process.argv.indexOf('-t') > -1;
var format = process.argv[process.argv.indexOf('--out')+1 || process.argv.indexOf('-o')+1 || -1];
var filenames = process.argv.slice(2).filter(function(filename, i, filenames) {
	return filename[0] !== '-' && (filenames[i-1] || '')[0] !== '-';
});

if (!filenames.length) {
	console.error('usage: pejs filename [options]');
	console.error('  --out to specify output file (%f.out.js)');
	console.error('  --tree to output the parsed template tree');
	process.exit(1);
}
if (filenames.length > 1 && !format) {
	console.error('multiple input files requires an output format ie --out %f.out.js');
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

if (format) {
	filenames.forEach(function(filename) {
		pejs.parse(filenames[0], function(err, src) {
			if (err) {
				console.error(err.message);
				process.exit(3);
			}
			fs.writeFile(format.replace('%f', filename.split('/').pop()), src);
		});
	});
	return;
}

pejs.parse(filenames[0], function(err, src) {
	if (err) {
		console.error(err.message);
		process.exit(3);
	}
	console.log(src);
});