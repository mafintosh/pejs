var assert = require('assert');
var pejs = require('pejs')(__dirname);

pejs.compile('fixtures', function(err, render, files) {
	if (err) throw err;

	assert.equal(files[0], __dirname+'/fixtures/index.ejs');
});
pejs.compile('fixtures/index', function(err, render, files) {
	if (err) throw err;

	assert.equal(files[0], __dirname+'/fixtures/index.ejs');
});
pejs.compile('fixtures/index.html', function(err, render, files) {
	if (err) throw err;

	assert.equal(files[0], __dirname+'/fixtures/index.html');
});
pejs.compile('fixtures/block-file.ejs', function(err, render, files) {
	if (err) throw err;

	assert.equal(files[0], __dirname+'/fixtures/block-file.ejs');
	assert.equal(files[1], __dirname+'/fixtures/static.ejs');
});
pejs.compile('fixtures/block-file', function(err, render, files) {
	if (err) throw err;

	assert.equal(files[0], __dirname+'/fixtures/block-file.ejs');
	assert.equal(files[1], __dirname+'/fixtures/static.ejs');
});
