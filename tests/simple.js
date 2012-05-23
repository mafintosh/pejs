var assert = require('assert');

require('pejs')(__dirname).compile('fixtures/simple.ejs', function(err, render) {
	if (err) throw err;

	assert.equal(render({bar:'bar'}), 'foo bar baz');
});
