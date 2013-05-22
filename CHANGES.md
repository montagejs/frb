
# v0.2

This release refactors most of the internals and some of the interface
to introduce a parent scope operator, `^`.  As such, bindings now have a
scope chain and the parameters, document object model, component object
model, and options are carried by the scope object.

The signature of assign has been extended:
assign(target, targetPath, value, parameters)
to
assign(target, targetPath, value, parameters, document, component)

## Backward-incompatible changes

### bindings

The document and component object models are no longer communicated to
bindings through the `document` and `serialization` parameters.

`Bindings.defineBinding(object, name, descriptor, parameters)` has
changed to `Bindings.defineBinding(object, name, descriptor,
commonDescriptor)` where commonDescriptor is `{parameters, document,
components}`

In a *future* release, the default parameters will be undefined.  The
default parameters are presently the source object which has allowed
us to work-around the lack of a parent scope operator.  Please migrate
your code from using `$` (parameters) to `^` (parent scope).  You can
verify that your bindings will continue to work in the future by passing
an empty object `{}` as the parameters explicitly.

### evaluate

The signature of evaluate functions as returned by compileEvaluator have
changed from `evaluate(value, parameters)` to `evaluate(scope)` such
that `evaluate(new Scope(value, null, parameters))` is equivalent to the
former rendition.

### assign

The signature of assign functions as returned from compileAssigner have
changed from `assign(value, target, parameters)` to `assign(value,
scope)` such that `assign(value, new Scope(target, null, parameters)` is
equivalent to the former rendition.

### expand

The signature of the `expand` function has changed to `expand(syntax,
scope)`, where `scope` is an object with optional `value`, `parameters`
and `components` properties.  The value and parameters must be syntax
nodes to replace value and parameters nodes in place.  The `components`
property must be an object with `getObjectLabel(component)` to get the
label for a component, in case the label differs from the one on the
syntax tree.

### observeGet

`Observers.observeGet` now delegates to `observeGet` method instead of
`observeKey`.

