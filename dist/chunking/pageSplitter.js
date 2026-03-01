"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitByPages = void 0;
const splitByPages = (text) => {
    return text.split("\f").filter(Boolean);
};
exports.splitByPages = splitByPages;
