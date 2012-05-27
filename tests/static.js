var assert = require('assert');

require('pejs')(__dirname+'/fixtures/static.ejs', function(err, render) {
	if (err) throw err;

	assert.equal(render(), 'foo');
});
