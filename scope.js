
module.exports = Scope;
function Scope(value, parent, parameters, document, components, beforeChange) {
    this.value = value;
    this.parent = parent;
    this.parameters = parameters;
    this.document = document;
    this.components = components;
    this.beforeChange = beforeChange;
}

Scope.nest = function (scope, value) {
    scope = scope || new Scope();
    return new Scope(
        value,
        scope,
        scope.parameters,
        scope.document,
        scope.components,
        scope.beforeChange
    );
};

