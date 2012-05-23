var assert = require('assert');

require('pejs')(__dirname).compile('fixtures/block-override.ejs', function(err, render) {
	if (err) throw err;

	assert.equal(render().replace(/\s+/g, ' ').trim(), 'foo baz');
});
