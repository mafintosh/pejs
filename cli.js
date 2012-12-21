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

filename = fs.realpathSync(filename);

pejs.parse(filename, function(err, src) {
	if (err) {
		console.error(err.message);
		process.exit(3);
	}
	console.log(src);
});