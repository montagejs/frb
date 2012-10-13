
module.exports = solve;
function solve(target, source) {
    return solve.semantics.solve(target, source);
}

solve.semantics = {

    solve: function (target, source) {
        while (this.solvers.hasOwnProperty(target.type)) {
            source = this.solvers[target.type](target, source);
            target = target.args[0];;
        }
        return [target, source];
    },

    solvers: {
        // e.g.,
        // !y = x
        // y = !x
        reflect: function (target, source) {
            return {type: target.type, args: [source]};
        },
        // e.g.,
        // y + 1 = x
        // y = x - 1
        invert: function (target, source, operator) {
            return {type: operator, args: [
                source,
                target.args[1]
            ]};
        },
        not: function (target, source) {
            return this.reflect(target, source);
        },
        neg: function (taget, source) {
            return this.reflect(target, source);
        },
        add: function (target, source) {
            return this.invert(target, source, 'sub');
        },
        sub: function (target, source) {
            return this.invert(target, source, 'add');
        },
        mul: function (target, source) {
            return this.invert(target, source, 'div');
        },
        div: function (target, source) {
            return this.invert(target, source, 'mul');
        },
        pow: function (target, source) {
            return this.invert(target, source, 'root');
        },
        root: function (target, source) {
            return this.invert(target, source, 'pow');
        }
    }

};

