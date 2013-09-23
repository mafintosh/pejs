var fs = require('fs');

var noop = function() {};
var watchers = {};

module.exports = function(filenames, fn) { // TODO: find or create a module that does caching/watching for us
	var onchange = function() {
		filenames.forEach(function(filename) {
			if (!watchers[filename]) return;
			watchers[filename].removeListener('change', onchange);
		});

		fn();
	};

	filenames.forEach(function watchFile(filename) {
		if (watchers[filename]) return watchers[filename].once('change', onchange);

		watchers[filename] = fs.watch(filename, {persistent:false}, noop);
		watchers[filename].setMaxListeners(0);
		watchers[filename].once('change', function() {
			delete watchers[filename];
			this.close();
		});

		watchFile(filename, fn);
	});
};