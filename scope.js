
module.exports = Scope;
function Scope(value) {
    this.parent = null;
    this.value = value;
}

Object.defineProperties(Scope.prototype, {
	parent: {
		value:null,
		writable: true
	},
	value: {
		value:null,
		writable: true
	}
});


Scope.prototype.nest = function (value) {
    var child = Object.create(this);
    child.value = value;
    child.parent = this;
    return child;
};

