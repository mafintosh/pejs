var assert = require('assert');
var pejs = require('pejs')(__dirname);

pejs.compile('fixtures', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'bar');
});
pejs.compile('fixtures/index', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'bar');
});
pejs.compile('fixtures/index.html', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'foo');
});
