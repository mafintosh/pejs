var assert = require('assert');

require('pejs')(__dirname).compile('fixtures/static.ejs', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'foo');
});
