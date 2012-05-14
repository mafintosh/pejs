# PEJS

PEJS is pre-compiled EJS with a inheritance, blocks and file support that works both in the client and on the server.  
It's available through npm:

	npm install pejs

## Disclamer

This module and documentation is still a work in progress so stuff might break and change.

## Usage

PEJS is easy to use:

``` js
var pejs = require('pejs');
var template = pejs('my-app-root');

template.render('test.html', {hello:'world'}, function(err, result) {
	// compiles and render test.html
	console.log(result);
});
template.compile('test.html', function(err, src) {
	// parses the template and compiles it down to portable js
	// this means it works in the client!
	console.log(src);
});
```

## Classic EJS

PEJS templates has your usual EJS syntax with `<%` and `%>`.

* inline code: `<% var a = 42; %>`
* insert: `<%- data %>`
* escape: `<%= data %>`

## File support

PEJS allows you to render other templates inside your template using the `<%@ filename %>` syntax.

	<%@ 'my-template.html' %>

The above renders and inserts to contents of `my-template.html` into the current template.
`my-template.html` will also be inlined if `template.compile` is used so it still works in the client.

## Blocks

PEJS also lets you define and declare blocks that you that later override using the `<%{` syntax:

* anchor and declare a block: `<%{{ block_name }}%>`
* override the content off a block: `<%{ block_name %>hello block<%} %>`

## Inheritance

Using blocks it's easy to implement template inheritance.  
Just declare a `base.html` with some anchored blocks:

	<body>
		Hello i am base
		<%{{ content }}%>
	</body>

Then a `child.html` that renders `base.html`

	<%@ 'base.html' %>
	<%{ content %>
		i am inserted in base
	<%} %>

To render the example just render `child.html`

``` js
template.render('child.html', function(err, result) {
	console.log(result);
});
```

The above outputs:

	<body>
		Hello i am base
		i am inserted in base		
	</body>

## License

MIT