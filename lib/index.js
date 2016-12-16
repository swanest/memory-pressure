const _ = require("lodash"),
    EventEmitter = require('events').EventEmitter,
    logLib = require("sw-logger"),
    tracer = new logLib.Logger({namespace: "memory-pressure"}),
    CustomError = logLib.CustomError;

var pressure = new Object();

pressure.new = function (name = "default", config = null) {
    if (name == "new")
        throw new Error("'new' is a reserved name. cannot be used as memory monitoring instance name");

    if (!_.isPlainObject(config))
        config = {};

    _.defaults(config, {
        memoryThreshold: 200 * 1000000,
        interval: 1000,
        stillUnderPressure: 20, //If still blocked after 20 check calls, emits `stillUnderPressure` event
        consecutiveGrowths: 5
    });

    let emitter = new EventEmitter(),
        history = [],
        stillBlockedCalls = 0,
        isBlocked = false,
        acked = true,
        currentTimeout = null,
        instance = pressure[name];

    if (instance != void 0)
        instance.clear();

    instance = {};
    instance.config = config;

    tracer.info("New memory instance", config);

    function check() {
        history.push(process.memoryUsage());
        if (history.length > instance.config.consecutiveGrowths)
            history.shift();

        tracer.info("Checking", history);

        if (history.length < instance.config.consecutiveGrowths) {
            currentTimeout = setTimeout(check, instance.config.interval);
            tracer.info("Not enough memory-usage history, skip. next memory usage check in " + instance.config.interval + "ms");
            return;
        }

        let isConsecutive = true,
            isExceeding = _.last(history).heapUsed > instance.config.memoryThreshold,
            countListeners = 0;

        for (var i = 1; i < history.length; i++) {
            if (history[i].heapUsed <= history[(i - 1)].heapUsed) {
                isConsecutive = false;
                break;
            }
        }

        tracer.info("IsConsecutive:", isConsecutive, "isExceeding", isExceeding, "isBlocked:", isBlocked, "isAcked", acked);

        if (acked && isConsecutive && isExceeding && !isBlocked) { //block
            tracer.info("underPressure...");
            isBlocked = true, countListeners = emitter.listenerCount("underPressure");
            if (countListeners > 0)
                tracer.info("emitted. (%n)", countListeners), acked = false, emitter.emit("underPressure", _.last(history));

        }
        else if (acked && isBlocked && !isExceeding) { //deblock
            tracer.info("pressureReleased...");
            isBlocked = false, stillBlockedCalls = 0, countListeners = emitter.listenerCount("pressureReleased");
            if (countListeners > 0)
                tracer.info("emitted. (%n)", countListeners), acked = false, emitter.emit("pressureReleased", _.last(history));

        }
        else if (acked && isBlocked) {
            stillBlockedCalls++;
            if (stillBlockedCalls > instance.config.stillUnderPressure) {
                tracer.info("stillUnderPressure...");
                stillBlockedCalls = 0, countListeners = emitter.listenerCount("stillUnderPressure");
                if (countListeners > 0)
                    tracer.info("emitted. (%n)", countListeners), acked = false, emitter.emit("stillUnderPressure", _.last(history));
            }
        }

        tracer.info("...Next check in", instance.config.interval + "ms");

        currentTimeout = setTimeout(check, instance.config.interval);
    };

    process.nextTick(function () {
        currentTimeout = setTimeout(check, instance.config.interval);
    });

    instance.on = emitter.on.bind(emitter);
    instance.clear = function () {
        tracer.info("Memory instance " + name + "'s timeout cleared")
        clearTimeout(currentTimeout);
    };

    instance.ack = function () { //Inform being ready for next state
        acked = true;
    };

    pressure[name] = instance;

    return instance;
};

pressure.new();

module.exports = pressure;