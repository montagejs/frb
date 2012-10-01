
# Functional Reactive Bindings

In their simplest form, bindings provide the illusion that two objects
have the same property.  Changing the property on one object causes the
same change in the other.  This is useful for coordinating state between
views and models, among other entangled objects.  For example, if you
enter text into a text field, the same text might be added to the
corresponding database record.

```javascript
bind(object, "a.b", {"<->": "c.d"});
```

Functional Reactive Bindings go farther.  They can gracefully bind long
property paths and the contents of collections.  They can also
incrementally update the results of chains of queries including maps,
flattened arrays, sums, and averages.  They can also add and remove
elements from sets based on the changes to a flag.  FRB makes it easy to
incrementally ensure consistent state.

```javascript
bind(company, "payroll", {"<-": "departments.map{employees.sum{salary}}.sum()"});
bind(document, "body.classList.has('dark')", {"<-": "darkMode", source: viewModel});
```

FRB is built from a combination of powerful functional and generic
building blocks, making it reliable, easy to extend, and easy to
maintain.


## Getting Started

`frb` is a CommonJS package, with JavaScript modules suitable for use
with [Node.js][] on the server side or [Mr][] on the client side. 

```
❯ npm install frb
```

[Node.js]: http://nodejs.org/
[Mr]: https://github.com/kriskowal/mr



## Tutorial

In this example, we bind `model.content` to `document.body.innerHTML`.

```javascript
var bind = require("frb/bind");
var model = {content: "Hello, World!"};
var cancelBinding = bind(document, "body.innerHTML", {
    "<-": "content",
    "source": model
});
```

When a source property is bound to a target property, the target gets
reassigned to the source any time the source changes.

```javascript
model.content = "Farewell.";
expect(document.body.innerHTML).toBe("Farewell.");
```

Bindings can be recursively detached from the objects they observe with
the returned cancel function.

```javascript
cancelBinding();
model.content = "Hello again!"; // doesn't take
expect(document.body.innerHTML).toBe("Farewell.");
```

### Two-way Bindings

Bindings can go one way or in both directions.  Declare one-way
bindings with the ```<-``` property, and two-way bindings with the
```<->``` property.

In this example, the "foo" and "bar" properties of an object will be
inexorably intertwined.

```javascript
var object = {};
var cancel = bind(object, "foo", {"<->": "bar"});

// <-
object.bar = 10;
expect(object.foo).toBe(10);

// ->
object.foo = 20;
expect(object.bar).toBe(20);
```

### Right-to-left

Note that even with a two-way binding, the right-to-left binding
precedes the left-to-right.  In this example, "foo" and "bar" are bound
together, but both have initial values.

```javascript
var object = {foo: 10, bar: 20};
var cancel = bind(object, "foo", {"<->": "bar"});
expect(object.foo).toBe(20);
expect(object.bar).toBe(20);
```

The right-to-left assignment of `bar` to `foo` happens first, so the
initial value of `foo` gets lost.

### Property chains

Bindings can follow deeply nested chains, on both the left and the right
side.

In this example, we have two object graphs, `foo`, and `bar`, with the
same structure and initial values.  This binds `bar.a.b` to `foo.a.b`
and also the other way around.

```javascript
var foo = {a: {b: 10}};
var bar = {a: {b: 10}};
var cancel = bind(foo, "a.b", {
    "<->": "a.b",
    source: bar
});
// <-
bar.a.b = 20;
expect(foo.a.b).toBe(20);
// ->
foo.a.b = 30;
expect(bar.a.b).toBe(30);
```

In this case, the source of the binding is a different object than the
target, so the binding descriptor specifies the alternate source.

### Structure changes

Changes to the structure of either side of the binding are no matter.
All of the orphaned event listeners will automatically be canceled, and
the binders and observers will reattach to the new object graph.

Continuing from the previous example, we store and replace the `a`
object from one side of the binding.  The old `b` property is now
orphaned, and the old `b` property adopted in its place.

```javascript
var a = foo.a;
expect(a.b).toBe(30); // from before

foo.a = {}; // orphan a and replace
foo.a.b = 40;
// ->
expect(bar.a.b).toBe(40); // updated

bar.a.b = 50;
// <-
expect(foo.a.b).toBe(50); // new one updated
expect(a.b).toBe(30); // from before it was orphaned
```

### Sum

Some advanced queries are possible with one-way bindings from
collections.

```javascript
var object = {array: [1, 2, 3]};
bind(object, "sum", {"<-": "array.sum()"});
expect(object.sum).toEqual(6);
```

### Average

```javascript
var object = {array: [1, 2, 3]};
bind(object, "average", {"<-": "array.average()"});
expect(object.average).toEqual(6);
```

### Map

You can also create mappings from one array to a new array and an
expression to evaluate on each item.  The mapped array is bound once,
and all changes to the source array are incrementally updated in the
target array.  Unaffected items in the array are not affected.

```javascript
var object = {objects: [
    {number: 10},
    {number: 20},
    {number: 30}
]};
bind(object, "numbers", {"<-": "objects.map{number}"});
expect(object.numbers).toEqual([10, 20, 30]);
object.objects.push({numbers: 40});
expect(object.numbers).toEqual([10, 20, 30]);
```

Any function, like `sum` or `average`, can be applied to the result of a
mapping.  The straight-forward path would be
`objects.map{number}.sum()`, but you can use a block with any function
as a short hand, `objects.sum{number}`.

### Flatten

You can flatten nested arrays.  In this example, we have an array of
arrays and bind it to a flat array.

```javascript
var arrays = [[1, 2, 3], [4, 5, 6]];
var object = {};
bind(object, "flat", {
    "<-": "flatten()",
    source: arrays
});
expect(object.flat).toEqual([1, 2, 3, 4, 5, 6]);
```

Note that changes to the inner and outer arrays are both projected into
the flattened array.

```javascript
arrays.push([7, 8, 9]);
array[0].unshift(0);
expect(object.flat).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
```

Also, as with all other bindings that produce arrays, the flattened
array is never replaced, just incrementally updated.

```javascript
var flat = object.flat;
arrays.splice(0, arrays.length);
expect(object.flat).toBe(flat); // === same object
```

### Reversed

You can bind the reversal of an array.

```javascript
var object = {forward: [1, 2, 3]};
bind(object, "backward", {
    "<->": "reversed()"
});
expect(object.backward).toEqual([3, 2, 1]);
object.forward.push(4);
expect(object.forward).toEqual([1, 2, 3, 4]);
expect(object.backward).toEqual([4, 3, 2, 1]);
```

Note that you can do two-way bindings, ```<->``` with reversed arrays.
Changes to either side are updated to the opposite side.

```javascript
object.backward.pop();
expect(object.backward).toEqual([4, 3, 2]);
expect(object.forward).toEqual([2, 3, 4]);
```

### Has

You can bind a property to always reflect whether a collection contains
a particular value.

```javascript
var object = {
    haystack: [1, 2, 3],
    needle: 3
};
bind(object, "hasNeedle", {"<-": "haystack.has(needle)"});
expect(object.hasNeedle).toBe(true);
object.haystack.pop(); // 3 comes off
expect(object.hasNeedle).toBe(false);
```

The binding also reacts to changes to the value you seek.

```javascript
// continued from above
object.needle = 2;
expect(object.hasNeedle).toBe(true);
```

`has` bindings are not incremental, but with the right data-structure,
updates are cheap.  The [Collections][] package contains Lists, Sets,
and OrderedSets that all can send content change notifications and thus
can be bound.

[Collections]: https://github.com/kriskowal/collections

```javascript
var Set = require("collections/set");
object.haystack = new Set([1, 2, 3]);
expect(object.hasNeedle).toBe(true);
```

`has` bindings can also be left-to-right and bi-directional.

```javascript
bind(object, "hasNeedle", {"<->": "haystack.has(needle)"});
object.hasNeedle = false;
expect(object.haystack.has(2)).toBe(false);
```

The collection on the left-hand-side must implement `has` or `contains`,
`add`, and `delete` or `remove`.  FRB shims `Array` to have `has`,
`add`, and `delete`, just like all the collections in [Collections][].
It happens that the `classList` properties of DOM elements, when they
are supported, implement `add`, `remove`, and `contains`.

```javascript
var model = {darkMode: false};
bind(document.body, "classList.has('dark')", {
    "<-": "darkMode",
    source: model
});
```

The DOM `classList` does not however implement
`addContentChangeListener` or `removeContentChangeListener`, so it
cannot be used on the right-hand-side of a binding, and such bindings
cannot be bidirectional.  With some DOM [Mutation Observers][], you
might be able to help FRB overcome this limitation in the future.

[Mutation Observers]: https://developer.mozilla.org/en-US/docs/DOM/DOM_Mutation_Observers

### Equals

You can bind to whether expressions are equal.

```javascript
var fruit = {apples: 1, oranges: 2};
bind(fruit, "equal", {"<-": "apples == oranges"});
expect(fruit.equal).toBe(false);
fruit.orange = 1;
expect(fruit.equal).toBe(true);
```

Equality can be bound both directions.  In this example, we do a two-way
binding between whether a radio button is checked and a corresponding
value in our model.

```javascript
bind(model, "fruit = 'orange'", {
    "<->": "checked",
    source: orangeElement
});
bind(model, "fruit = 'apple'", {
    "<->": "checked",
    source: appleElement
});

orangeElement.checked = true;
expect(model.fruit).toEqual("orange");

appleElement.checked = true;
expect(model.fruit).toEqual("apple");
```

Because equality and assignment are interchanged in this language, you
can use either `=` or `==`.

### Operators

FRB can also recognize most operators.  These are in order of precedence
unary `-` negation and `!` and logical negation and binary `**` (power),
`*`, `/`, `%` modulo, `%%` remainder, `+`, `-`, ```<```, ```>```,
```<=```, ```>=```, `=` or `==`, `!=`, `&&` and `||`.

```javascript
var object = {height: 10};
bind(object, "heightPx", {"<-": "height + 'px'"});
```

Negation and logical negation can be bound in both directions.

```javascript
var caesar = {toBe: false};
bind(caesar, "notToBe", {"<->": "!toBe"});
expect(caesar.toBe).toEqual(false);
expect(caesar.notToBe).toEqual(true);

caesar.notToBe = false;
expect(caesar.toBe).toEqual(true);
```

### Literals

You may have noticed literals in the previous examples.  String literals
take the form of any characters between single quotes.  Any character
can be escaped with a back slash.

```javascript
var object = {};
bind(object, "greeting", {"<-": "'Hello, World!'"});
expect(object.greeting).toBe("Hello, World!");
```

To distingish array indicies from number literals, the number literal
must have a prefix `#`.

```javascript
var array = [1, 2, 3];
var object = {};
bind(object, 'zero', {"<-": "#0", source: array});
bind(object, 'one', {"<-": "0", source: array});
```

### Tuples

Bindings can produce fixed-length arrays.  These are most useful in
conjunction with mappings.  Tuples are comma-delimited and
parantheses-enclosed.

```javascript
var object = {array: [[1, 2, 3], [4, 5]]};
bind(object, "summary", {"<-": "array.map{(length, sum())}"});
expect(object.summary).toEqual([
    [3, 6],
    [2, 9]
]);
```

### Records

Bindings can also produce fixed-shape objects.  The notation is
comma-delimited, colon-separated items, enclosed by curly-braces.

```javascript
var object = {array: [[1, 2, 3], [4, 5]]};
bind(object, "summary", {
    "<-": "array.map{{length: length, sum: sum()}}"
});
expect(object.summary).toEqual([
    {length: 3, sum: 6},
    {length: 2, sum: 9}
]);
```

The left hand side of an item in a record is any combination of letters
or numbers.  The right side is any expression.

### Parameters

Bindings can also involve parameters.  The source of parameters is by
default the same as the source.  The source, in turn, defaults to the
same as the target object.  It can be specified on the binding
descriptor.  Parameters are declared by any expression following a
dollar sign.

```javascript
var object = {a: 10, b: 20, c: 30};
bind(object, "foo", {
    "<-": "($a, $b, $c)"},
    parameters: object
});
```

Bindings also react to changes to the parameters.

```javascript
object.a = 0;
object.b = 1;
object.c = 2;
expect(object.foo).toEqual([0, 1, 2]);
```

The degenerate case of the property language is an empty string.  This
is a valid property path that observes the value itself.  So, as an
emergent pattern, a `$` expression by itself corresponds to the whole
parameters object.

```javascript
var object = {};
bind(object, "ten", {"<-": "$", parameters: 10});
expect(object.ten).toEqual(10);
```

### Observers and Binders

FRB’s bindings use observers and binders internally.  You can create an
observer from a property path with the `observe` function exported by
the `frb/observe` module.

```javascript
var object = {foo: {bar: 10}};
var cancel = observe(object, "foo.bar", function (value) {
    // 10
    // 20
});
object.foo.bar = 10;
object.foo.bar = 20;
```

For more complex cases, you can specify a descriptor instead of the
callback.  For example, to observe a property’s value *before it changes*, you can use the `beforeChange` flag.

```javascript
var object = {foo: {bar: 10}};
var cancel = observe(object, "foo.bar", {
    set: function (value) {
        // 10
        // 20
    },
    beforeChange: true
});
object.foo.bar = 20;
object.foo.bar = 30;
```

If the product of an observer is an array, that array is always updated
incrementally.  It will only get emitted once.  If you want it to get
emitted every time its content changes, you can use the `contentChange`
flag.

```javascript
var array = [[1, 2, 3], [4, 5, 6]];
observe(array, "map{sum()}", {
    set: function (sums) {
        // 1. [6, 15]
        // 2. [6, 15, 0]
        // 3. [10, 15, 0]
    },
    contentChange: true
});
array.push([0]);
array[0].push(4);
```

### Nested Observers

To get the same effect as the previous example, you would have to nest
your own content change observer.

```javascript
var array = [[1, 2, 3], [4, 5, 6]];
var cancel = observe(array, "map{sum()}", function (array) {
    function contentChange() {
        // 1. expect(array).toEqual([6, 15]);
        // 2. expect(array).toEqual([6, 15, 0]);
        // 3. expect(array).toEqual([10, 15, 0]);
    }
    array.addContentChangeListener(contentChange);
    return function cancelContentChange() {
        array.removeContentChangeListener(contentChange);
    };
});
array.push([0]);
array[0].push(4);
cancel();
```

This illustrates one crucial aspect of the architecture.  Observers
return cancelation functions.  You can also return a cancelation
function inside a callback observer.  That canceler will get called each
time a new value is observed, or when the parent observer is canceled.
This makes it possible to nest observers.

```javascript
var object = {foo: {bar: 10}};
var cancel = observe(object, "foo", function (foo) {
    return observe(foo, "bar", function (bar) {
        expect(bar).toBe(10);
    });
});
```

### Bindings

FRB provides utilities for declaraing and managing multiple bindings on
objects.  The `frb` (`frb/bindings`) module exports this interface.

```javascript
var Bindings = require("frb");
```

The `Bindings.create` and `Bindings.define` methods have a similar
interface.  The `create` function creates a new object with properties
and bindings.  The `define` function augments an existing object.  The
properties object is just key value pairs to copy to the object, for
convenience.

```javascript
var object = Bindings.create(Object.prototype, {
    a: 10,
    b: 20
});
expect(object.a).toEqual(10);
expect(object.b).toEqual(20);

Bindings.define(object, {
    b: 30,
    c: 50
});
expect(object.b).toEqual(30);
expect(object.c).toEqual(50);
```

### Binding Descriptors

The third argument of both `create` and `define` is an object containing
property descriptors.  These are the same property descriptors you see
with EcmaScript 5’s `Object.defineProperty`.  They additionally can
contain bindings or dependent paths.

If a descriptor has a ```<-``` or ```<->```, it is a binding descriptor.
FRB creates a binding, adds the canceler to the descriptor, and adds the
descriptor to an internal table that tracks all of the bindings defined
on that object.

```javascript
var object = Bindings.create(null, {
    darkMode: false,
    document: document
}, {
    "document.body.classList.has('dark')": {
        "<-": "darkMode"
    }
});
```

You can get all the binding descriptors with `Bindings.getBindings`, or a
single binding descriptor with `Bindings.getBinding`.  `Bindings.cancel` cancels
all the bindings to an object and `Bindings.cancelBinding` will cancel just
one.

```javascript
var bindings = Bindings.getBindings(object);
var descriptor = Bindings.getBinding(object, "document.body.classList.has('dark')");
Bindings.cancelBinding(object, "document.body.classList.has('dark')");
Bindings.cancel(object);
```

### Dependent Paths

The source of a binding can be a computed property.  In that case, the
source property needs to be annotated with a path or list of paths that
the property uses as input.

In this example, we create an object as the root of multiple bindings.
The object synchronizes the properties of a "form" object with the
window’s search string, effectively navigating to a new page whenever
the "q" or "charset" entries of the form change.

```javascript
var app = Bindings.create(Object.prototype, {
    window: window,
    form: {
        q: "",
        charset: "utf-8"
    }
}, {
    queryString: {
        dependencies: ["form.q", "form.charset"],
        get: function () {
            return "?" + QS.stringify({
                q: this.form.q,
                charset: this.form.charset
            });
        }
    },
    "window.location.search": {
        "<-": "queryString"
    }
});
```


## Reference

Functional Reactive Bindings is an implementation of synchronous,
incremental object-property and collection-content bindings for
JavaScript.  It was ripped from the heart of the [Montage][] web
application framework and beaten into this new, slightly magical form.
It must prove itself worthy before it can return.

[Montage]: https://github.com/montagejs/montage

-   **functional**: The implementation uses functional building blocks
    to compose observers and binders.
-   **generic**: The implementation uses generic methods on collections,
    like `addContentChangeListener`, so any object can implement the
    same interface and be used in a binding.
-   **reactive**: The values of properties and contents of collections
    react to changes in the objects and collections on which they
    depend.
-   **synchronous**: All bindings are made consistent in the statement
    that causes the change.  The alternative is asynchronous, where
    changes are queued up and consistency is restored in a later event.
-   **incremental**: If you update an array, it produces a content
    change which contains the values you added, removed, and the
    location of the change.  Most bindings can be updated using only
    these values.  For example, a sum is updated by decreasing by the
    sum of the values removed, and increasing by the sum of the values
    added.  FRB can incrementally update `map`, `reversed`, `flatten`,
    `sum`, and `average` observers.  It can also incrementally update
    `has` bindings.
-   **unwrapped**: Rather than wrap objects and arrays with observable
    containers, FRB modifies existing arrays and objects to make them
    dispatch property and content changes.  For objects, this involves
    installing getters and setters using the ES5 `Object.defineProperty`
    method.  For arrays, this involves replacing all of the mutation
    methods, like `push` and `pop`, with variants that dispatch change
    notifications.  The methods are either replaced by swapping the
    `__proto__` or adding the methods to the instance with
    `Object.defineProperties`.  These techniques should [work][]
    starting in Internet Explorer 9, Firefox 4, Safari 5, Chrome 7, and
    Opera 12.

[work]: http://kangax.github.com/es5-compat-table/#define-property-webkit-note


### Architecture

-   **property and content change events** for objects and arrays using
    getters and setters for observable objects and either prototype
    swapping or method override for observable arrays.  Other collection
    types can implement the same interface to be compatible with all
    subsequent layers.  Caveats: you have to use a `set` method on
    Arrays to dispatch property and content change events.  Does not
    work in older Internet Explorers since they support neither
    prototype assignment or ES5 property setters.
-   **observer** functions for watching an entire object graph for
    incremental changes, and gracefully rearranging and canceling those
    observers as the graph changes.  Observers can be constructed
    directly or with a very small query language that compiles to a tree
    of functions so no parsing occurs while the graph is being watched.
-   one- and two-way **bindings** for incrementally updating properties
    with the results of observed queries.
-   **declarative** interface for creating an object graph with
    bindings, properties, and computed properties with dependencies.


### Declarations

The highest level interface for FRB resembles the ES5 Object constructor
and can be used to declare objects and define and cancel bindings on
them with extended property descriptors.

```javascript
var Bindings = require("frb");

// create an object
var object = Bindings.create(null, { // prototype
    // simple properties
    foo: 0,
    graph: [
        {numbers: [1,2,3]},
        {numbers: [4,5,6]}
    ]
}, {
    // extended property descriptors
    bar: {"<->": "foo", enumerable: false},
    numbers: {"<-": "graph.map{numbers}.flatten()"},
    sum: {"<-": "numbers.sum()"},
    reversed: {"<-": "numbers.reversed()"}
});

expect(object.bar).toEqual(object.foo);
object.bar = 10;
expect(object.bar).toEqual(object.foo);
expect.foo = 20;
expect(object.bar).toEqual(object.foo);

// note that the identity of the bound numbers array never
// changes, because all of the changes to that array are
// incrementally updated
var numbers = object.numbers;

// first computation
expect(object.sum).toEqual(21);

// adds an element to graph,
// which pushes [7, 8, 9] to "graph.map{numbers}",
// which splices [7, 8, 9] to the end of
//  "graph.map{numbers}.flatten()",
// which increments "sum()" by [7, 8, 9].sum()
object.graph.push({numbers: [7, 8, 9]});
expect(object.sum).toEqual(45);

// splices [1] to the beginning of [1, 2, 3],
// which splices [1] to the beginning of "...flatten()"
// which increments "sum()" by [1].sum()
object.graph[0].numbers.unshift(1);
expect(object.sum).toEqual(46);

// cancels the entire observer hierarchy, then attaches
//  listeners to the new one.  updates the sum.
object.graph = [{numbers: [1,2,3]}];
expect(object.sum).toEqual(6);

expect(object.reversed).toEqual([3, 2, 1]);

expect(object.numbers).toBe(numbers) // still the same object

Bindings.cancelBindings(object); // cancels all bindings on this object and
// their transitive observers and event listeners as deep as
// they go
```

-   `Bindings.create(prototype, properties, descriptors)`
-   `Bindings.define(object, properties, descriptors)`
-   `Bindings.defineBinding(object, name, descriptor)`
-   `Bindings.getBindings(object)`
-   `Bindings.getBinding(object, name)`
-   `Bindings.cancelBindings(object)`
-   `Bindings.cancelBinding(object, name)`

A binding descriptor contains:

-   `target`: the
-   `targetPath`: the target
-   `targetSyntax`: the syntax tree for the target path
-   `source`: the source object, which defaults to `target`
-   `sourcePath`: the source path, from either ```<-``` or ```<->```
-   `sourceSyntax`: the syntax tree for the source path
-   `twoWay`: whether the binding goes in both directions, if ```<->```
    was the source path.
-   `parameters`: the parameters, which default to `source`.
-   `cancel`: a function to cancel the binding

### Bindings

The `bind` module provides direct access to the `bind` function.

```javascript
var bind = require("frb/bind");

var source = [{numbers: [1,2,3]}, {numbers: [4,5,6]}];
var target = {};
var cancel = bind(target, "summary", {
    "<-": "map{(numbers.sum(), numbers.average())}",
    source: source
});

expect(target.summary).toEqual([
    [6, 2],
    [15, 5]
]);

cancel();
```

`bind` is built on top of `parse`, `compileBinder`, and
`compileObserver`.


### Observers

The `observe` modules provides direct access to the `observe` function.
`observe` is built on top of `parse` and `compileObserver`.
`compileObserver` creates a tree of observers using the methods in the
`observers` module.

```javascript
var observe = require("frb/observe");

var source = [1, 2, 3];
var sum;
var cancel = observe(source, "sum()", function (newSum) {
    sum = newSum;
});

expect(sum).toBe(6);

source.push(4);
expect(sum).toBe(10);

source.unshift(0); // no change
expect(sum).toBe(10);

cancel();
source.splice(0, source.length); // would change
expect(sum).toBe(10);
```

`observe` produces a cancelation hierarchy.  Each time a value is
removed from an array, the underlying observers are canceled.  Each time
a property is replaced, the underlying observer is canceled.  When new
values are added or replaced, the observer produces a new canceler.  The
cancel function returned by `observe` commands the entire underlying
tree.

Observers also optional accept a descriptor argument in place of a
callback.

-   `set`: the change handler, receives `value` for most observers, but
    also `key` and `object` for property changes.
-   `parameters`: the value for `$` expressions.
-   `beforeChange`: instructs an observer to emit the previous value
    before a change occurs.
-   `contentChange`: instructs an observer to emit an array every time
    its content changes.  By default, arrays are only emitted once.

```javascript
var object = {};
var cancel = observe(object, "array", {
    set: function (value) {
        // may return a cancel function for a nested observer
    },
    parameters: {},
    beforeChange: false,
    contentChange: true
});

object.array = []; // emits []
object.array.push(10); // emits [10]
```


### The Language

Bindings and observers used a small query language intended to resemble
the same code that you would write in JavaScript to update a binding by
brute force.

#### Grammar

-   **expression** = **term** *delimited by* `.`
-   **term** = **literal** *or* `(` **expression** `)` *or* **property
    name** *or* **function call** *or* **block call**
-   **property name** = ( **non space character** )+
-   **block name** = **function name** *or* `map`
-   **function name** = `flatten` *or* `reversed` *or* `sum` *or*
    `average` *or* `has`
-   **function call** = **function name** `(` **tuple** `)`
-   **block call** = **function name** `{` **expression** `}`
-   **tuple** = **expression** *delimited by* `,`
-   **literal** = **string literal** *or* **number literal**
-   **number literal** = `#` ( **non space character** )+
-   **string literal** = `'` ( **non quote character** *or* `\`
    **character** )* `'`

All of this grammar can be used on the right hand side of a binding.
The left hand side of a binding permits a strict subset.

-   **last term** = **property name** *or* **has call**
-   **has call** = `has(` **expression** `)`

#### Semantics

An expression is observed with a source value and emits a target
one or more times.  All expressions emit an initial value.  Array
targets are always updated incrementally.  Numbers and boolean are
emited anew each time their value changes.

-   The first term is evaluated with the source value.
-   Each subsequent term uses the target of the previous as its source.
-   Literals are interpreted as their corresponding value.
-   A property expression observes the named key of the source object.
-   A "map" block observes the source array and emits a target array.
    The target array is emitted once and all subsequent updates are
    reflected as content changes that can be independently observed with
    `addContentChangeListener`.  Each element of the target array
    corresponds to the observed value of the block expression using the
    respective element in the source array as the source value.
-   Any function call with a "block" implies calling the function on the
    result of a "map" block.
-   A "flatten" function call observes a source array and produces a
    target array.  The source array must only contain inner arrays.  The
    target array is emitted once and all subsequent updates can be
    independently observed with `addContentChangeListener`.  The target
    array will always contain the concatenation of all of the source
    arrays.  Changes to the inner and outer source arrays are reflected
    with incremental splices to the target array in their corresponding
    positions.
-   A "reversed" function call observes the source array and produces a
    target array that contains the elements of the source array in
    reverse order.  The target is incrementally updated.
-   A "sum" function call observes the numeric sum of the source array.
    Each alteration to the source array causes a new sum to be emitted,
    but the sum is computed incrementally by observing the smaller sums
    of the spliced values, added and removed.
-   An "average" function call observes the average of the input values,
    much like "sum".
-   A "has" function call observes the source collection for whether it
    contains an observed value.
-   A "tuple" expression observes a source value and emits a single
    target array with elements corresponding to the respective
    expression in the tuple.  Each inner expression is evaluated with
    the same source value as the outer expression.

On the left hand side of a binding, the last term has alternate
semantics.  Binders receive a target as well as a source.

-   A "property" observes an object and a property name from the target,
    and a value from the source.  When any of these change, the binder
    upates the value for the property name of the object.
-   A "has" function call observes a boolean value from the source, and
    an collection and a sought value from the target.  When the value is
    true and the value is absent in the collection, the binder uses the
    `add` method of the collection (provided by a shim for arrays) to
    make it true that the collection contains the sought value.  When
    the value is false and the value does appear in the collection one
    or more times, the binder uses the `delete` or `remove` method of
    the collection to remove all occurrences of the sought value.

#### Interface

```javascript
var parse = require("frb/parse");
var compileObserver = require("frb/compile-observer");
var compileBinder = require("frb/compile-binder");
```

-   `parse(text)` returns a syntax tree.
-   `compileObserver(syntax)` returns an observer function of the form
    `observe(callback, source, parameters)` which in turn returns a
    `cancel()` function.  `compileObserver` visits the syntax tree and
    creates functions for each node, using the `observers` module.
-   `compileBinder(syntax)` returns a binder function of the form
    `bind(observeValue, source, target, parameters)` which in turn
    returns a `cancel()` function.  `compileBinder` visits the root node
    of the syntax tree and delegates to `compileObserver` for its terms.
    The root node must be a `property` at this time, but could
    conceivably be any function with a clear inverse operation like
    `map` and `reversed`.

#### Syntax Tree

The syntax tree is JSON serializable and has a "type" property.  Nodes
have the following types:

-   `value` corresponds to observing the source value
-   `parameters` corresponds to observing the parameters object
-   `literal` has a `value` property and observes that value

All other node types have an "args" property that is an array of syntax
nodes.

-   `property`: corresponds to observing a property named by the right
    argument of the left argument.
-   `map`: the left is the input, the right is an expression to observe
    on each element of the input.
-   `tuple`: has any number of arguments, each an expression to observe
    in terms of the source value.

For all function calls, the right hand side is a tuple of arguments,
presently ignored.

-   `reversed`
-   `flatten`
-   `sum`
-   `average`


### Observers and Binders

The `observers` module contains functions for making all of the
different types of observers, and utilities for creating new ones.
All of these functions are or return an observer function of the form
`observe(emit, value, parameters)` which in turn returns `cancel()`.

-   `observeValue`
-   `observeParameters`
-   `makeLiteralObserver(value)`
-   `makeRelationObserver(callback, thisp)` is unavailable through the
    property binding language, translates a value through a JavaScript
    function.
-   `makePropertyObserver(observeObject, observeKey)`
-   `makeMapObserver(observeArray, observeRelation)`
-   `makeTupleObserver(...observers)`
-   `makeObserversObserver(observers)`
-   `makeReversedObserver(observeArrayh)`
-   `makeWindowObserver` is not presently available through the language
    and is subject to change.  It is for watching a length from an array
    starting at an observable index.
-   `makeFlattenObserver(observeArray)`
-   `makeSumObserver(observeArray)`
-   `makeAverageObserver(observeArray)`

These are utilities for making observer functions.

-   `makeNonReplacing(observe)` accepts an array observer (the emitted
    values must be arrays) and returns an array observer that will only
    emit the target once and then incrementally update that target.  All
    array observers use this decorator to handle the case where the
    source value gets replaced.
-   `makeArrayObserverMaker(setup)` generates an observer that uses an
    array as its source and then incrementally updates a target value,
    like `sum` and `average`.  The `setup(source, emit)` function must
    return an object of the form `{contentChange, cancel}` and arrange
    for `emit` to be called with new values when `contentChange(plus,
    minus, index)` receives incremental updates.
-   `makeUniq(callback)` wraps an emitter callback such that it only
    forwards new values.  So, if a value is repeated, subsequent calls
    are ignored.
-   `autoCancelPrevious(callback)` accepts an observer callback and
    returns an observer callback.  Observer callbacks may return
    cancelation functions, so this decorator arranges for the previous
    canceler to be called before producing a new one, and arranges for
    the last canceler to be called when the whole tree is done.
-   `once(callback)` accepts a canceler function and ensures that the
    cancelation routine is only called once.

The `binders` module contains similar functions for binding an observed
value to a bound value.  All binders are of the form `bind(observeValue,
source, target, parameters)` and return a `cancel()` function.

-   `makePropertyBinder(observeObject, observeKey)`
-   `makeHasBinder(observeCollection, observeValue)`


### Change Events

#### Object Property Changes

To use object observers, `require("frb/properties")`.  Observers depend
on EcmaScript 5's `Object.defineProperty` and `Object.defineProperties`
or a suitable shim.  Observable collections benefit from the ability to
swap `__proto__` in all engines except Internet Explorer, in which case
they fall back to using `Object.defineProperties` to trap change
functions.

Listen for individual property changes on an object.  The listener may
be a function or a delegate.

-   `addOwnPropertyChangeListener(object, key, listener, beforeChange)`
-   `removeOwnPropertyChangeListener(object, key, listener, beforeChange)`
-   `addBeforeOwnPropertyChangeListener(object, key, listener)`
-   `removeBeforeOwnPropertyChangeListener(object, key, listener)`

The arguments to the listener are `(value, key, object)`, much like a
`forEach` callback.  The `this` within the listener is the listener
object itself.  The dispatch method must be one of these names, favoring
the most specific provided.

-   `handle` + key (TwoHump) + (`Change` or `WillChange` before change),
    for example, `handleFooWillChange` for `foo`.
-   `handleOwnPropertyChange` or `handleOwnPropertyWillChange` before
    change
-   `handleEvent`
-   function

#### Custom Property Change Observers

The property change listener functions delegate to a
`makePropertyObservable(key)` and `makePropertyUnobservable(key)` if
they exist.  So, these can be used to augment host objects, like parts
of the DOM, to accommodate property change listeners.  The `dom` module
monkey-patches HTML element prototoypes to make some properties
observable, like the "checked" property of radio and checkbox input
elements using the `addEventListener("change")` interface.

#### Array Content Changes

To use array content observers,
`require("frb/array")`.  This will install the
necessary methods on the `Array` prototype.  The performance of arrays
in general will not be affected&mdash;only observed arrays will require
more time to execute changes.

Listen for ranged content changes on arrays.  The location of the change
is where the given arrays of content are removed and added.  For
unordered collections like sets, the location would not be defined.
Content changes are not yet implemented for other collections.

-   `array.addContentChangeListener(listener, beforeChange)`
-   `array.removeContentChangeListener(listener, beforeChange)`
-   `array.addBeforeContentChangeListener(listener)`
-   `array.removeBeforeContentChangeListener(listener)`

The arguments to the listener are `(plus, minus, at)`, which are arrays
of the added and removed values, and optionally the location of the
change for ordered collections (lists, arrays).  For a list, the
position is denoted by a node.  The dispatch method must be one of these
names, favoring the most specific provided.

-   `handleContentChange` or `handleContentWillChange` if before change
-   `handleEvent`
-   function

Listen for content changes from each position within an array, including
changes to and from undefined.  Content changes must be emitted by
method calls on an array, so use `array.set(index, value)` instead of
`array[index] = value`.

-   `array.addEachContentChangeListener(listener, beforeChange)`
-   `array.removeEachContentChangeListener(listener, beforeChange)`
-   `array.addBeforeEachContentChangeListener(listener)`
-   `array.removeBeforeEachContentChangeListener(listener)`

The listener is a listener as for property changes.

