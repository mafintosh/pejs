var free = true;
var waiting = [];

// "locks" the execution - let everyone else wait for something to finish
var lock = function(callback, fn) { // TODO: move to module
	if (!free) return waiting.push(arguments);

	free = false;
	fn(function() {
		free = true;
		callback.apply(null, arguments);
		if (waiting.length) lock.apply(null, waiting.shift());
	});
};

module.exports = lock;