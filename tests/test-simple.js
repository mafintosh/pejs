var assert = require('assert');

require('./templating').render('./fixtures/simple.ejs', {bar:'bar'}, function(err, result) {
	if (err) throw err;

	assert.equal(result, 'foo bar baz');
});
