var fs = require('fs');
var vm = require('vm');
var path = require('path');

var STATIC            = 'STATIC';
var LOGIC             = 'LOGIC';
var EXPRESSION        = 'EXPRESSION';
var ESCAPE_EXPRESSION = 'ESCAPE_EXPRESSION';
var BLOCK_DECLARE     = 'BLOCK_DECLARE';
var BLOCK_OVERRIDE    = 'BLOCK_OVERRIDE';
var BLOCK_ANONYMOUS   = 'BLOCK_ANONYMOUS';

var TOKEN_BEGIN = '<%';
var TOKEN_END   = '%>';

var MATCH_BLOCK = /^(\w+)?\s*((?:'(?:(?:\\')|[^'])*')|(?:"(?:(?:\\")|[^"])*"))?(?:\s+(.+))?$/;

var ROOT = path.resolve('/'); // find out what / is in windows terms

var noop = function() {};

// parse pejs source into a source tree
var parse = function(src) {
	return Array.prototype.concat.apply([], src.split(TOKEN_END).map(function(slice) {
		return slice.split(TOKEN_BEGIN);
	})).map(function(data, i) {
		if (i % 2 === 0) return data && {type:STATIC, value:data};

		var pre = (data.match(/^(\S*)/g) || [])[0];
		var end = (data.match(/(\S*)$/g) || [])[0];
		var line = data.replace(/^\S*/g, '').replace(/\S*$/g, '').trim();
		var live = pre[1] === '[';
		var auto = pre === '{{' ? BLOCK_DECLARE : BLOCK_OVERRIDE;
		var ctx = (pre+end).replace(/[\{\[]+/g, '{').replace(/[\}\]]+/g, '}');

		if (pre === '')  return {type:LOGIC, value:line};
		if (pre === '#') return null;
		if (pre === '=') return {type:ESCAPE_EXPRESSION, value:line};
		if (pre === '-') return {type:EXPRESSION, value:line};

		line = (line.match(MATCH_BLOCK) || []).slice(1);
		line = !line.length || (line[2] && !line[2]) ? {} : {
			name:line[0],
			url:line[1] && line[1].substr(1, line[1].length-2).replace(/\\(.)/g, '$1'),
			locals:line[2] && line[2].trim()
		};

		if (ctx === '{}' && line.name) return {type:auto, live:live, name:line.name, locals:line.locals, url:line.url, body:[]};
		if (ctx === '{}' && line.url)  return {type:BLOCK_ANONYMOUS, url:line.url, locals:line.locals};
		if (ctx === '{' && line.name)  return {type:auto, live:live, name:line.name, locals:line.locals, capture:1, body:[]};
		if (ctx === '}')               return {capture:-1};

		throw new SyntaxError('could not parse: <%'+data+'%>');
	}).reduce(function reduce(result, node) {
		var last = result[result.length-1];

		if (!node) return result;
		if (!last || !last.capture) return result.concat(node);

		last.capture += node.capture || 0;
		last.body = last.capture ? last.body.concat(node) : last.body.reduce(reduce, []);
		return result;
	}, []);
};

// compile a source tree down to javascript
var compile = function(tree) {
	var stringify = function(tree, indent) {
		var lvl = indent;

		return 'function($t,locals){\n'+lvl+'\twith (locals) {\n'+tree.reduce(function(result, node) {
			result += indent+'\t\t';

			if (node.type === STATIC)            return result+'$t.w('+JSON.stringify(node.value)+');\n';
			if (node.type === EXPRESSION)        return result+'$t.w('+node.value+');\n';
			if (node.type === ESCAPE_EXPRESSION) return result+'$t.e('+node.value+');\n';
			if (node.type === LOGIC)             return result+node.value+'\n';

			var name = JSON.stringify(node.name || null);
			var locals = node.locals || 'locals';
			var fn = node.body.length ? ','+stringify(node.body, indent+'\t\t') : '';

			if (node.type === BLOCK_DECLARE || node.type === BLOCK_ANONYMOUS) {
				return result+'$t.d('+name+','+!!node.live+','+locals+fn+');\n';
			}
			if (node.type === BLOCK_OVERRIDE) {
				return result+'$t.o('+name+','+locals+fn+');\n';
			}
		}, '').replace(/\n\s+$/g,'\n')+lvl+'\t}\n'+lvl+'}';
	};

	// TODO: maybe write this as a prototype to speed up initialization?
	var template = function() {
		var $t = {};
		var buffer;
		var blocks = {};
		var result = '';

		$t.w = function(data) {
			if (typeof data === 'object' && data) {
				(buffer = buffer || []).push(result, data);
				result = '';
				return;
			}
			result += data;
		};
		$t.e = function(data) {
			return $t.w((''+data).replace(/&(?!\w+;)/g,'&amp;').replace(/>/g,'&gt;').replace(/</g, '&lt;').replace(/"/g,'&quot;'));
		};
		$t.o = function(name, locals, block) {
			var $b = blocks[name];

			if (!$b) return;
			$b.locals = locals;
			$b.block = block;
		};
		$t.d = function(name, live, locals, block) {
			if (!name) return block($t, locals);

			var $b = blocks[name] = template();
			var toString = $b.toString;

			$b.toString = function() {
				if ($b.block) {
					$b.block($b, $b.locals);
				}
				return ($b.toString = toString)();
			};

			$t.w($b);
			$t.o(name, locals, block);
		};
		$t.toString = function() {
			if (buffer) {
				result = buffer.join('')+result;
				buffer = null;
			}
			return result;
		};

		return $t;
	};

	var out = '(function() {\n';

	out += '\tvar template = '+template.toString()+';\n';
	out += '\tvar reduce = '+stringify(tree, '').split('\n').join('\n\t')+';\n';
	out += '\treturn function (locals) {\n\t\tvar $t = template();\n\t\treduce($t,locals || {});\n\t\treturn $t.toString();\n\t};\n}());';

	return out;
};

var findFile = function(file, callback) {
	var name = path.join.apply(path, [].concat(file));
	var files = [name, name+'.ejs', name+'.html', path.join(name, 'index.ejs'), path.join(name, 'index.html')];

	var loop = function() {
		var file = files.shift();

		if (!file) return callback();

		fs.stat(file, function(err, stat) {
			if (err || stat.isDirectory()) return loop();

			fs.realpath(file, function(err, filename) {
				fs.readFile(filename, 'utf-8', function(err, src) {
					callback(err, filename, src);
				});
			});
		});
	};

	loop();
};

// resolve the name by looking in views or as a direct path
var resolve = function(name, cwd, callback) {
	if (name[0] === '/') return findFile(name, callback);
	if (name[0] === '.') return findFile([cwd, name], callback);

	var loop = function() {
		findFile([cwd, 'views', name], function(err, file, src) {
			if (file || cwd === ROOT) return callback(null, file, src);

			cwd = path.join(cwd, '..');
			loop();
		});
	};

	loop();
};

// create a 'not-found' error
var enoent = function(message) {
	var err = new Error(message);
	err.code = 'ENOENT';
	return err;
};

var free = true;
var waiting = [];

// "locks" the execution - let everyone else wait for something to finish
var lock = function(callback, fn) {
	if (!free) return waiting.push(arguments);

	free = false;
	fn(function(err, val) {
		free = true;

		callback(err, val);
		if (waiting.length) lock.apply(null, waiting.shift());
	});
};

var watchers = {};

var watchFiles = function(filenames, fn) {
	var onchange = function() {
		filenames.forEach(function(filename) {
			if (!watchers[filename]) return;
			watchers[filename].removeListener('change', onchange);
		});

		fn();
	};

	filenames.forEach(function watchFile(filename) {
		if (watchers[filename]) return watchers[filename].once('change', onchange);

		watchers[filename] = fs.watch(filename, {persistent:false});
		watchers[filename].setMaxListeners(0);
		watchers[filename].once('change', function() {
			delete watchers[filename];
			this.close();
		});

		watchFile(filename, fn);
	});
};

var cache = exports.cache = {};

exports.tree = function(name, callback) {
	var files = [];

	var action = function(name, cwd, callback) {
		resolve(name, cwd, function(err, filename, src) {
			if (err) return callback(err);
			if (!filename) return callback(enoent(name+' could not be found'));

			files.push(filename);

			var dir = path.dirname(filename);
			var tree = parse(src);

			var nodes = [];
			var visit = function(node) {
				if (node.url) nodes.push(node);
				if (node.body) node.body.forEach(visit);
			};

			tree.forEach(visit);

			if (!nodes.length) return callback(null, tree);

			var i = 0;
			var loop = function() {
				var node = nodes[i++];

				if (!node) return callback(null, tree);

				action(node.url, dir, function(err, resolved) {
					if (err) return callback(err);

					node.body = resolved;
					loop();
				});
			};

			loop();
		});
	};

	lock(callback, function(free) {
		if (cache[name]) return free(null, cache[name].tree);

		action(name, process.cwd(), function(err, tree) {
			if (err) return free(err);

			cache[name] = cache[name] || {};
			cache[name].tree = tree;

			watchFiles(files, function() {
				delete cache[name];
			});

			free(null, tree);
		});
	});
};

exports.parse = function(name, callback) {
	if (cache[name] && cache[name].source) return callback(null, cache[name].source);

	exports.tree(name, function(err, tree) {
		if (err) return callback(err);

		cache[name].source = cache[name].source || compile(tree);

		callback(null, cache[name].source);
	});
};

exports.render = function(name, locals, callback) {
	if (typeof locals === 'function') return exports.render(name, {}, locals);

	if (cache[name] && cache[name].render) {
		var result;

		try {
			result = cache[name].render(locals);
		} catch (err) {
			return callback(err);
		}

		return callback(null, result);
	}

	exports.parse(name, function(err, source) {
		if (err) return callback(err);

		try {
			cache[name].render = cache[name].render || vm.runInNewContext(source, {console:console});
		} catch (err) {
			return callback(err);
		}

		exports.render(name, locals, callback);
	});
};