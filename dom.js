
var Properties = require("./properties");

// for whatever reason, HTMLInputElement is not the same as the global of the
// same name, at least in Chrome
var HTMLInputElement = Object.getPrototypeOf(document.createElement("input"));

function changeChecked(event) {
    Properties.dispatchPropertyChange(event.target, "checked", event.target.checked);
}

function changeValue(event) {
    Properties.dispatchPropertyChange(event.target, "value", event.target.value);
}

HTMLInputElement.makePropertyObservable = function (key) {
    if (key === "checked") {
        this.addEventListener("change", changeChecked);
    } else if (key === "value") {
        this.addEventListener("change", changeValue);
        if (this.type === "text") {
            this.addEventListener("keyup", changeValue);
        }
    }
};

HTMLInputElement.makePropertyUnobservable = function (key) {
    if (key === "checked") {
        this.removeEventListener("change", changeChecked);
    } else if (key === "value") {
        this.removeEventListener("change", changeValue);
        if (this.type === "text") {
            this.removeEventListener("keyup", changeValue);
        }
    }
}

// TODO make window.history state observable

