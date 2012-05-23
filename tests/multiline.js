var assert = require('assert');

require('pejs')(__dirname).compile('fixtures/multiline.ejs', function(err, render) {
	if (err) throw err;

	console.log(render().replace(/\s+/g, ' ').trim(), 'first line foo 1 baz foo 2 baz foo 3 baz');
});
