var GLOBAL_FNS = 'function _esc_(s){return (s+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}\n'+
	'function _inline_(fn){var s=fn();return function(){return s;};}\n';

// compile a source tree down to javascript
var codegen = function(tree, opts) {
	if (!opts) opts = {};

	var global = [GLOBAL_FNS];
	var cnt = 0;

	var compress = function(str) {
		return opts.compress ? str.replace(/\s+/g, ' ') : str;
	};

	var wrap = function(vars, body) {
		return vars ? 'with(locals){var _r=[];var _b={};\n'+body+'}\n' : 'with(locals){\n'+body+'}\n';
	};

	var debugable = function(url) {
		return '_'+(url || '').split('/').slice(-2).join('_').replace(/[^a-zA-Z]/g, '_')+'_'+(cnt++);
	};

	var stringify = function(tree) {
		var src = '';
		var pushBefore = false;

		var push = function(value) {
			if (pushBefore) return src = src.slice(0,-3)+'+'+value+');\n';
			src += '_r.push('+value+');\n';
			pushBefore = true;
		};

		var logic = function(value) {
			pushBefore = false;
			src += value+'\n';
		};

		tree.forEach(function(node) {
			if (node.type === 'STATIC')            return push(JSON.stringify(compress(node.value)));
			if (node.type === 'EXPRESSION')        return push('('+node.value+')');
			if (node.type === 'ESCAPE_EXPRESSION') return push('_esc_('+node.value+')');
			if (node.type === 'LOGIC')             return logic(node.value);

			var locals = node.locals || 'locals';
			var name = node.name && JSON.stringify(node.name);
			var decl = node.name && JSON.stringify(node.name+'$decl');
			var id = debugable(node.url);

			if (node.type === 'BLOCK_ANONYMOUS') {
				global.push('function '+id+'(_r,_b,locals){'+wrap(false, stringify(node.body))+'}\n');
				return logic(id+'(_r,_b,'+locals+');');
			}

			if (node.type === 'BLOCK_DECLARE') {
				logic('if (_b['+decl+']) _b['+decl+'].toString=_inline_(_b['+decl+'].toString);');
				logic('_r.push(_b['+decl+']={toString:function(){return _b['+name+']();}});');
			}

			global.push('function '+id+'(locals){'+wrap(true, stringify(node.body)+'return _r;')+'}\n');
			logic('_b['+name+']=function(){return '+id+'('+locals+').join("");};');
		});

		return src;
	};

	var main = debugable(opts.name);
	var src = stringify(tree);
	return global.join('')+'module.exports=function '+main+'(locals){locals=locals||{};'+wrap(true,src)+'return _r.join("");};';
};

module.exports = codegen;