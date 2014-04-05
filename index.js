var vm = require('vm');
var path = require('path');
var fs = require('fs');
var resolve = require('resolve');
var parse = require('./parse');
var codegen = require('./codegen');
var watch = require('./watch'); // TODO: find a module that does this
var sequence = require('./sequence'); // TODO: find a module that does this

var noop = function() {};

var requireSource = function(source) {
	var module = {exports:{}};
	vm.runInNewContext(source, {console:console, module:module});
	return module.exports;
};

var pejs = function(opts) {
	if (!opts) opts = {};

	opts.basedir = opts.basedir || process.cwd();

	var templates = {};
	var cache = templates.cache = {};
	var compress = opts.compress;

	var resolvePath = function(name, dirname, callback) {
		resolve(name, {
			basedir: dirname,
			extensions: ['.pejs', '.ejs', '.html'],
			moduleDirectory: 'views'
		}, callback);
	};

	templates.render = function(name, locals, callback) {
		if (typeof locals === 'function') return templates.render(name, {}, locals);

		locals = locals || {};

		if (cache[name] && cache[name].render) {
			var result;

			try {
				result = cache[name].render(locals);
			} catch (err) {
				return callback(err);
			}

			return callback(null, result);
		}

		templates.compile(name, function(err, source) {
			if (err) return callback(err);

			try {
				cache[name].render = cache[name].render || requireSource(source);
			} catch (err) {
				return callback(err);
			}

			templates.render(name, locals, callback);
		});
	};

	templates.compile = function(name, opts, callback) {
		if (typeof opts === 'function') return templates.compile(name, {}, opts);
		if (cache[name] && cache[name].source) return callback(null, cache[name].source);

		opts = opts || {};

		var maybePrecompiled = function(callback) {
			if (opts.cejs === false) return callback();

			resolvePath(name, opts.dirname, function(err, path) {
				if (!path) return callback();

				fs.readFile(path+'.cejs', 'utf-8', function(err, src) {
					if (err) return callback(err);

					cache[name] = cache[name] || {};
					cache[name].source = cache[name].source || src;
					callback(null, cache[name].source);
				});
			});
		};

		maybePrecompiled(function(err, source) {
			if (source) return callback(null, source);

			templates.parse(name, function(err, tree, url) {
				if (err) return callback(err);

				cache[name].source = cache[name].source || codegen(tree, {name:url, compress:compress});
				callback(null, cache[name].source);
			});
		});
	};

	templates.parse = function(name, callback) {
		var files = [];

		var onsource = function(filename, source, callback) {
			var dirname = path.dirname(filename);
			var tree = parse(source, opts);

			files.push(filename);

			var nodes = [];
			var visit = function(node) {
				if (node.url) nodes.push(node);
				if (node.body) node.body.forEach(visit);
			};

			tree.forEach(visit);

			if (!nodes.length) return callback(null, tree, filename);

			var i = 0;
			var loop = function() {
				var node = nodes[i++];

				if (!node) return callback(null, tree, filename);

				resolveTemplate(node.url, dirname, function(err, resolved, url) {
					if (err) return callback(err);

					node.url = url;
					node.body = resolved;
					loop();
				});
			};

			loop();
		};

		var resolveTemplate = function(name, dirname, callback) {
			resolvePath(name, dirname, function(err, filename) {
				if (err) return callback(err);

				fs.readFile(filename, 'utf-8', function(err, source) {
					if (err) return callback(err);

					onsource(filename, source, callback);
				});
			});
		};

		sequence(callback, function(free) {
			if (cache[name] && cache[name].tree) return free(null, cache[name].tree, cache[name].url);

			resolveTemplate(name, opts.basedir, function(err, tree, url) {
				if (err) return free(err);

				cache[name] = cache[name] || {};
				cache[name].tree = tree;
				cache[name].url = url;

				if (opts.watch === false) return free(null, tree, url);

				watch(files, function() {
					delete cache[name];
				});

				free(null, tree, url);
			});
		});
	};

	return templates;
};

pejs.__express = pejs().render;

module.exports = pejs;