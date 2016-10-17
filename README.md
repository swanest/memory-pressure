# memory-pressure
Event emitter related to memory usage & pressure

#Install

```
npm install memory-pressure --save
```

#Usage

By default, a default instance is created when requiring the module.

```js

const pressure = require("memory-pressure"),
      byDefault = pressure.default,
      own = pressure.new("ownInstance", {
              memoryThreshold: 200 * 1000000, //200MB
              interval: 1000, //1sec
              stillUnderPressure: 20, //If still blocked after 20 check calls, emits `stillUnderPressure` event
              consecutiveGrowths: 5
      });

byDefault.on("underPressure", function (memoryUsage) { //memoryUsage is the object returned by process.memoryUsage()
    //Do some stuff to release pressure
    pressure.default.ack(); //Ready for next state (required)
});

byDefault.on("stillUnderPressure", function (memoryUsage) { //This event is emitted if you did not manage to release memory after `underPressure` event
    pressure.default.ack(); //Ready for next state
});

byDefault.on("pressureReleased", function (memoryUsage) {
    pressure.default.ack(); //Ready for next state
});

pressure.ownInstance.on(...,...);


```

