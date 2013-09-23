var assert = require('assert');

require('./templating').render('./fixtures/static.ejs', function(err, result) {
	if (err) throw err;

	assert.equal(result, 'foo');
});
