const _ = require("lodash"),
    EventEmitter = require('events').EventEmitter,
    logLib = require("logger"),
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
        interval: 3000,
        manualReleaseRequired: 20, //If still blocked after 20 check calls (1 min), emits `manualReleaseRequired` event
        consecutiveGrowths: 7
    });

    var instance = pressure[name];

    if (instance != void 0)
        instance.clear();

    var emitter = new EventEmitter(),
        history = [],
        stillBlockedCalls = 0,
        isBlocked = false,
        currentTimeout = null;

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

        let isConsecutive = true;
        for (var i = 1; i < history.length; i++) {
            if (history[i].heapUsed <= history[(i - 1)].heapUsed) {
                isConsecutive = false;
                break;
            }
        }

        tracer.info("IsConsecutive:", isConsecutive, "isBlocked:", isBlocked);

        if (isConsecutive && _.last(history).heapUsed > instance.config.memoryThreshold && !isBlocked) { //block
            tracer.info("underPressure emitted...");
            isBlocked = true;
            emitter.emit("underPressure", _.last(history));
        }
        else if (isBlocked && (_.last(history).heapUsed <= instance.config.memoryThreshold)) { //deblock
            tracer.info("pressureReleased emitted...");
            isBlocked = false;
            stillBlockedCalls = 0;
            emitter.emit("pressureReleased", _.last(history));
        }
        else if (isBlocked) {
            tracer.info("manualReleaseRequired emitted...");
            stillBlockedCalls++;
            if (stillBlockedCalls > instance.config.manualReleaseRequired)
                stillBlockedCalls = 0, emitter.emit("manualReleaseRequired");
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
    pressure[name] = instance;
    return instance;
};

pressure.new();

module.exports = pressure;