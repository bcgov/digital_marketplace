"use strict";
exports.__esModule = true;
var react_1 = require("react");
function renderList(params, list) {
    return (function (props) {
        return (list.map(item, function (string) {
            <div>{item}</div>;
        }));
    });
}
function makeVerticalBar(params) {
    var strong_strings = ["string", "thing"];
    return function (props) {
        return (<div>
        {renderList(params, strong_strings)}
      </div>);
    };
}
exports["default"] = makeVerticalBar;
