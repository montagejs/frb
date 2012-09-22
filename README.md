
# Functional Reactive Bindings

Two-way bindings for JavaScript as a CommonJS package.

Architecture, from the bottom up:

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


```
npm install frb
```


## Declarations

The highest level interface for FRB resembles the ES5 Object constructor
and can be used to declare objects and define and cancel bindings on
them with extended property descriptors.

```javascript
var Frb = require("frb");

// create an object
var object = Frb.create(null, { // prototype
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
    sum: {"<-": "numbers.sum()"}
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

expect(object.numbers).toBe(numbers) // still the same object

Frb.cancel(object); // cancels all bindings on this object and
// their transitive observers and event listeners as deep as
// they go
```

-   `Frb.create(prototype, properties, descriptors)`
-   `Frb.define(object, properties, descriptors)`
-   `Frb.defineProperty(object, name, descriptor)`
-   `Frb.cancelProperty(object, name)`
-   `Frb.cancel(object)`
-   `Frb.getCancelers(object)`
-   `Frb.getCancelerForName(object, name)`


## Bindings

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


## Observers

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


## The Language

Bindings and observers used a small query language intended to resemble
the same code that you would write in JavaScript to update a binding by
brute force.

### Grammar

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

### Semantics

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

### Interface

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

### Syntax Tree

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


## Observers and Binders

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


## Change Events

### Object Own Property Changes

To use object observers, `require("frb/object")`.
This installs the necessary methods on the `Object` constructor.
Observers depend on EcmaScript 5's `Object.defineProperty` and
`Object.defineProperties` or a suitable shim.  Observable collections
benefit from the ability to swap `__proto__` in all engines except
Internet Explorer, in which case they fall back to using
`Object.defineProperties` to trap change functions.

Listen for individual property changes on an object.  The listener may
be a function or a delegate.

-   `Object.addOwnPropertyChangeListener(object, key, listener, beforeChange)`
-   `Object.removeOwnPropertyChangeListener(object, key, listener, beforeChange)`
-   `Object.addBeforeOwnPropertyChangeListener(object, key, listener)`
-   `Object.removeBeforeOwnPropertyChangeListener(object, key, listener)`

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

### Array Content Changes

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

