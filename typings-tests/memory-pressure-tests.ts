import * as memoryPressure from '../lib';

const instance: memoryPressure.MemoryPressure = memoryPressure.new('blabla');
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