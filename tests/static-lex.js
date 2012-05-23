var assert = require('assert');

require('pejs')(__dirname).lexer('fixtures/static.ejs', function(err, tree) {
	if (err) throw err;

	assert.equal(tree[0].type, 'STATIC');
	assert.equal(tree[0].value, 'foo');
});
