var fs = require('fs');
var path = require('path');
var vm = require('vm');

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

var noop = function() {};
var parse = function(src) {
	return Array.prototype.concat.apply([], src.split(TOKEN_END).map(function(slice) {
		return slice.split(TOKEN_BEGIN);
	})).map(function(data, i) {
		if (i % 2 === 0) return data && {type:STATIC, value:data};

		var pre = (data.match(/^(\S*)/g) || [])[0];
		var end = (data.match(/(\S*)$/g) || [])[0];
		var line = data.replace(/^\S*/g, '').replace(/\S*$/g, '').trim();
		var live = !!(pre[1] === '[');
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
		if (ctx === '{}' && line.url)  return {type:BLOCK_ANONYMOUS, url:line.url};
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
var compile = function(tree) {
	var stringify = function(tree, indent) {
		var lvl = indent;

		return 'function($t,locals){\n'+lvl+'\twith (locals) {\n'+tree.reduce(function(result, node) {
			result += indent+'\t\t';

			if (node.type === STATIC) return result+'$t.w('+JSON.stringify(node.value)+');\n';
			if (node.type === EXPRESSION) return result+'$t.w('+node.value+');\n';
			if (node.type === ESCAPE_EXPRESSION) return result+'$t.e('+node.value+');\n';
			if (node.type === LOGIC) return result+node.value+'\n';

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
var parser = function(root) {
	root = root || '.';

	var cache = {};
	var resolve = function(files, callback) {
		var file = files.shift();

		if (files.length === 0) return callback(null, file);
		fs.stat(file, function(err, stat) {
			if (!err && !stat.isDirectory()) return callback(null, file);
			resolve(files, callback);
		});
	};
	var parseTree = function(file, deps, callback) {
		var end = function(err, tree) {
			end = noop;
			callback(err, tree);
		};

		resolve([file, file+'.ejs', file+'.html', path.join(file,'index.ejs'), path.join(file,'index.html')], function(err, url) {
			if (err) return end(err);

			deps.push(url);
			fs.readFile(url, 'utf-8', function(err, src) {
				if (err) return end(err);

				var cwd = path.dirname(url);
				var tree = parse(src);
				var waiting = 0;
				var update = noop;

				tree.forEach(function visit(node) {
					if (node.url) {
						waiting++;
						parseTree(path.join(node.url[0] === '/' ? root : cwd, node.url), deps, function(err, tree) {
							if (err) return end(err);

							node.body = tree;
							waiting--;
							update();
						});
						return;
					}
					if (node.body) {
						node.body.forEach(visit);
					}
				});
				update = function() {
					if (waiting) return;
					end(null, tree);
				};
				update();
			});
		});
	};

	var template = {};	

	template.lexer = function(file, callback) {
		var files = [];

		parseTree(path.join(root, file), files, function(err, tree) {
			callback(err, tree, files);
		});
	};
	template.parse = function(file, callback) {
		template.lexer(file, function(err, tree, files) {
			callback(err, tree && compile(tree), files);
		});
	};
	template.compile = function(file, callback) {
		template.parse(file, function(err, src, deps) {
			if (err) return callback(err);

			var render;

			try {
				render = vm.runInNewContext(src, {console:console});			
			} catch (err) {
				return callback(err);
			}

			callback(null, render, deps);
		});
	};

	return template;
};

module.exports = parser;