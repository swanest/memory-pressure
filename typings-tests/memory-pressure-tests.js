"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memoryPressure = require("../lib");
const instance = memoryPressure.new('blabla');
instance.on(memoryPressure.EVENTS.PRESSURE_RELEASED, function () {
    console.log('Pressure released');
});
instance.on(memoryPressure.EVENTS.UNDER_PRESSURE, function () {
    console.log('Under pressure');
});
if (instance.isBlocked()) {
    console.log('isBlocked');
}
instance.clear();
console.log('cleared');
