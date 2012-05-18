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

template.compile('example/simple.html', function(err, render) {
	// compiles test.html into a rendering function
	console.log(render());
});
template.compile('example/simple.html', function(err, src) {
	// parses the template and compiles it down to portable js
	// this means it works in the client!
	console.log(src);
});
```

## Classic EJS

PEJS templates has your usual EJS syntax with `<%` and `%>`. Read more about EJS [here](http://embeddedjs.com/)

* inline code: `<% var a = 42; %>`
* insert: `<%- data %>`
* escape: `<%= data %>`

## Blocks

PEJS expands the original EJS syntax by letting you declare blocks using the `<%{` syntax.  
A block is basically a partial template that optionally can be loaded from a file.

* declare block: `<%{{ blockName }}%>`
* declare file block: `<%{ 'filename.html' }%>`
* override block: `<%{ blockName %>hello block<%} %>`

In general all block can be loaded from a file instead of being defined inline by providing a filename:

* declare block: `<%{{ myBlock 'example/simple.html' }}%>`
* override block: `<%{ myOverrideBlock 'example/simple.html' }%>`

If you want include a block using a different set of locals than in you current scope you pass these as the last argument to the block.

* declare block: `<%{{ myBlock {newLocalsArg:oldLocalsArg} }}%>`
* override block: `<%{ 'example/simple.html', newLocalsHere }%>`

## Inheritance

Using blocks it's easy to implement template inheritance.  
Just declare a `base.html` with some anchored blocks:

	<body>
		Hello i am base
		<%{{ content }}%>
	</body>

Then a `child.html` that renders `base.html`

	<%{ 'base.html' }%>
	<%{ content %>
		i am inserted in base
	<%} %>

To render the example just render `child.html`

``` js
template.compile('child.html', function(err, render) {
	console.log(render());
});
```

The above outputs:

	<body>
		Hello i am base
		i am inserted in base		
	</body>

## License

MIT