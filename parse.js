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

module.exports = parse;