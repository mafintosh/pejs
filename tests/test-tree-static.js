var assert = require('assert');

require('./templating').parse('./fixtures/static.ejs', function(err, tree) {
	if (err) throw err;

	assert.equal(tree[0].type, 'STATIC');
	assert.equal(tree[0].value, 'foo');
});
