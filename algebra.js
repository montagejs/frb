
// TODO commute literals on the left side of a target operand, when possible

module.exports = solve;
function solve(target, source) {
    return solve.semantics.solve(target, source);
}

solve.semantics = {

    solve: function (target, source) {
        while (true) {
            // simplify the target
            while (this.simplifiers.hasOwnProperty(target.type)) {
                var simplification = this.simplifiers[target.type](target);
                if (simplification) {
                    target = simplification;
                } else {
                    break;
                }
            }
            // solve for bindable target (rotate terms to source)
            if (!this.solvers.hasOwnProperty(target.type)) {
                break;
            }
            source = this.solvers[target.type](target, source);
            target = target.args[0];
        }
        return [target, source];
    },

    simplifiers: {
        not: function (syntax) {
            var left = syntax.args[0];
            if (left.type === "not") {
                return left.args[0];
            }
        },
        add: function (syntax) {
            var left = syntax.args[0];
            if (left.type === "literal" && left.value === "") {
                // "" + x
                // string(x)
                // because this can be bound bidirectionally with number(y)
                return {
                    type: "string",
                    args: [syntax.args[1]]
                };
            }
        },
        // DeMorgan's law applied to `some` so we only have to implement
        // `every`.
        someBlock: function (syntax) {
            return {type: "not", args: [
                {type: "everyBlock", args: [
                    syntax.args[0],
                    {type: "not", args: [
                        syntax.args[1]
                    ]}
                ]}
            ]};
        }
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
        number: function (target, source) {
            return this.reflect(target, source);
        },
        string: function (target, source) {
            return this.reflect(target, source);
        },
        not: function (target, source) {
            return this.reflect(target, source);
        },
        neg: function (target, source) {
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

