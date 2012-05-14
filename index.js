var fs = require('fs');
var vm = require('vm');
var path = require('path');

var noop = function() {};
var template = function(locals, blocks) {
	var nostr = function() {
		return '';
	};
	var resolve = function() {
		var val = this.toString();

		this.toString = function() {
			this.toString = nostr;
			return val;
		};
	};
	var toString = function() {
		var t = template(locals, blocks);

		this.toString = nostr;
		this.fn(t);
		return t.toString();
	};

	blocks = blocks || {};
	
	var result = '';
	var buf;
	var _t = {};

	_t.w = function(str) {
		if (typeof str === 'string' && !str) return;
		if (typeof str === 'object' && str) {
			(buf = buf || []).push(result, str);
			result = '';
			return;
		}
		result += str;
	};
	_t.e = function(str) {
		_t.w((''+str).replace(/&(?!\w+;)/g,'&amp;').replace(/>/g,'&gt;').replace(/</g, '&lt;').replace(/"/g,'&quot;'));
	};
	_t.b = function(options, fn) {
		var name = options.name;
		var blk = blocks[name];

		if (options.decl && blk) {
			blk.resolve();
			delete blocks[name];
		}
		if (options.decl) {
			blk = blocks[name] = {};
			blk.resolve = resolve;
			blk.toString = toString;
		}
		if (!blk) return;

		blk.fn = fn || nostr;
		_t.w(blk);
	};
	_t.r = function(render, nextLocals) {
		nextLocals = nextLocals || locals;
		
		var t = template(nextLocals, blocks);

		render(t, nextLocals);
		return t;
	};
	_t.toString = function() {
		return (buf ? buf.join('') : '') + result;
	};
	return _t;
};

module.exports = function(root, options) {
	root = root || '.';

	var parse = function(filename, callback) {
		var cwd = path.dirname(filename);

		fs.readFile(filename, 'utf-8', function(err, src) {
			if (err) return callback(err);

			var parsed;
			var waiting = 0;
			var update = function(err) {
				if (err) {
					update = noop;
					callback(err);
					return;
				}
				if (waiting) return;

				var src = parsed.map(function(line) {
					return Array.isArray(line) ? line.join('') : line;
				}).join('\n');

				callback(null, '(function(_t,locals){with(locals){\n'+src+'\n}})');
			};
			var process = function(line) {
				var map = {};
				var save = function(_, filename) {
					filename = path.join(filename[0] === '/' ? root : cwd, filename);

					if (map[filename]) return map[filename];

					waiting++;
					parse(filename, function(err, parsed) {
						if (err) return update(err);

						waiting--;
						map[filename] = '_t.r('+parsed;
						update();
					});
				};
				var toString = function() {
					return line.replace(/@render\('((?:(?:\\')|[^'])*)'/g, save).replace(/@render\("((?:(?:\\")|[^"])*)"/g, save);
				};

				toString(); // lets bootstrap it
				return {toString: toString};
			};
			
			parsed = Array.prototype.concat.apply([], src.split('<%').map(function(slice) {
				return slice.split('%>');
			})).map(function(line, i) {
				if (i % 2 === 0) return '_t.w('+JSON.stringify(line)+');';

				line = line.split(' ');

				var pre = line.shift();
				var suf = line.length > 1 ? line.pop() : pre;
				var decl = pre.length === 2;

				line = line.join(' ');

				// syntax rewrite
				if (pre === '@')  {
					pre = '-';
					line = '@render('+line+')';
				}
				
				if (pre === '')   return process(line);
				if (pre === '#')  return '';
				if (pre === '-')  return ['_t.l=',process(line),'\n_t.w(_t.l);'];
				if (pre === '=')  return ['_t.l=',process(line),'\n_t.e(_t.l);'];
				// blocks
				if ((pre === '{{' && suf === '}}') || (pre === '{' && suf === '}')) return '_t.b('+JSON.stringify({name:line,decl:decl})+');';
				if ((pre === '[[' && suf === ']]') || (pre === '[' && suf === ']')) return '_t.b('+JSON.stringify({name:line,decl:decl,dom:1})+');';
				if (pre === '{' || pre === '{{')                                    return '_t.b('+JSON.stringify({name:line,decl:decl})+',function(_t){';
				if (pre === '[' || pre === '[[')                                    return '_t.b('+JSON.stringify({name:line,decl:decl,dom:1})+',function(_t){';
				if (suf === '}' || suf === '}}' || suf === ']' || suf === ']]')     return '});';

				return line;
			});

			update();
		});
	};
	var portableParse = function(filename, callback) {
		parse(path.join(root, filename), function(err, src) {
			if (err) return callback(err);

			callback(null, '(function() {'+
			'var template = '+template.toString().trim()+';var render='+src+';return function(locals){'+
				'locals=locals||{};'+
				'var main=template(locals);'+
				'render(main,locals);'+
				'return main.toString();'+
			'}}())');
		});
	};
	var compile = function(filename, callback) {
		portableParse(filename, function(err, src) {
			if (err) return callback(err);

			var fn;

			try {
				fn = vm.runInNewContext(src, {
					console: console
				});				
			} catch (err) {
				return callback(err);
			}
			callback(null, fn);
		});
	};

	var that = {};

	that.compile = function(filename, callback) {
		portableParse(filename, callback);
	};
	that.render = function(filename, options, callback) {
		if (!callback) {
			callback = options;
			options = {};
		}
		compile(filename, function(err, render) {
			if (err) return callback(err);

			var rendered;

			try {
				rendered = render(options || {});
			} catch (err) {
				return callback(err);
			}
			callback(null, rendered);
		});
	};

	return that;
};