
var parse = require("./grammar").parse;
console.log("HERE");

try {
    console.log(JSON.stringify(parse("[[], 1.2, 2 ?? 1 ** 2 * 2 + 1 - 2, [(!2 != 2)]]"), null, 4));
    console.log(JSON.stringify(parse("+2 + 'a\\0' + \"\" || true ? 10 : 20"), null, 4));
    console.log(JSON.stringify(parse("{a: 10, b: c}"), null, 4));
    console.log(JSON.stringify(parse("a.map{c}"), null, 4));
} catch (exception) {
    exception.message += " at " + exception.line + ":" + exception.column;
    throw exception;
}

