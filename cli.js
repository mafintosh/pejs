#!/usr/bin/env node

var fs = require('fs');
var pejs = require('./index');

var join = process.argv.indexOf('--join') > -1 || process.argv.indexOf('-j') > -1;
var tree = process.argv.indexOf('--tree') > -1 || process.argv.indexOf('-t') > -1;
var format = process.argv[process.argv.indexOf('--out')+1 || process.argv.indexOf('-o')+1 || -1];
var filenames = process.argv.slice(2).filter(function(filename, i, filenames) {
	return filename[0] !== '-' && (filenames[i-1] || '')[0] !== '-';
});

if (!filenames.length) {
	console.error('usage: pejs filename1, filename2, ... [options]');
	console.error('  --out to specify output file (%f.out.js)');
	console.error('  --join to join multiple input files into a single export');
	console.error('  --tree to output the parsed template tree');
	process.exit(1);
}
if (filenames.length > 1 && !format && !join) {
	console.error('multiple input files requires --join or an output format ie --out %f.out.js');
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

if (format || join) {
	filenames.forEach(function(filename) {
		pejs.parse(filenames[0], function(err, src) {
			if (err) {
				console.error(err.message);
				process.exit(3);
			}
			var file = filename.split('/').pop();
			var name = file.replace(/\.[^.]+$/, '');
			var output = format && format.replace('%f', file).replace('%n', name);

			if (join) {
				src = src.replace('module.exports', 'exports['+JSON.stringify(name)+']');
				if (output) return fs.appendFileSync(output, src);
				return console.log(src);
			}

			fs.writeFileSync(output, src);
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