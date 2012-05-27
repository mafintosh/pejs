var assert = require('assert');
var pejs = require('pejs');

pejs(__dirname+'/fixtures', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'bar');
});
pejs(__dirname+'/fixtures/index', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'bar');
});
pejs(__dirname+'/fixtures/index.html', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'foo');
});
