var assert = require('assert');
var templating = require('./templating');

templating.render('./fixtures', function(err, result) {
	if (err) throw err;

	assert.equal(result, 'bar');
});
templating.render('./fixtures/index', function(err, result) {
	if (err) throw err;

	assert.equal(result, 'bar');
});
templating.render('./fixtures/index.html', function(err, result) {
	if (err) throw err;

	assert.equal(result, 'foo');
});
