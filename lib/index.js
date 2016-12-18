const _ = require("lodash"),
    EventEmitter = require('events').EventEmitter,
    CustomError = require("sw-logger").CustomError,
    tracer = new (require("sw-logger").Logger)({namespace: "memory-pressure"}),
    //Events
    UNDER_PRESSURE = "underPressure",
    PRESSURE_RELEASED = "pressureReleased",

    pressure = new Object();


//Make events name accessible from outside
pressure.EVENTS = {};
pressure.EVENTS.UNDER_PRESSURE = UNDER_PRESSURE;
pressure.EVENTS.PRESSURE_RELEASED = PRESSURE_RELEASED;


//Helper to create a new memory pressure handler
pressure.new = function (name = "default", config = null) {
    if (name == "new" || name == UNDER_PRESSURE || name == PRESSURE_RELEASED)
        throw new Error(`${name} is a reserved name: it cannot be used as a memory monitoring instance name`);
    if (!_.isPlainObject(config))
        config = {};

    //Instance default configuration
    _.defaults(config, {
        memoryThreshold: 200 * 1000000,
        interval: 1000,
        consecutiveGrowths: 5
    });

    //Instance emitter internal variables
    let emitter = new EventEmitter(),
        history = [],
        isBlocked = false,
        currentTimeout = null,
        counter = 0,
        instance = pressure[name];

    if (instance != void 0)
        instance.clear();

    instance = {};
    instance.config = config;

    //Make status accessible from outside
    instance.isBlocked = function isBlockedFn() {
        return isBlocked;
    };

    instance.on = emitter.on.bind(emitter);

    instance.clear = function () {
        tracer.info("Memory pressure handler " + name + " cleared");
        clearTimeout(currentTimeout);
        emitter.removeAllListeners(PRESSURE_RELEASED);
        emitter.removeAllListeners(UNDER_PRESSURE);
    };

    tracer.info("New memory instance", config);

    function throwError() {
        tracer.error("Status ack method called twice in the same listener");
        throw new CustomError("duplicatedAcking", "a memory status cannot be ack'd twice in the same listener", 500, "fatal");
    };

    function ack() {
        counter--;
        tracer.info("Status ack'd. leftover acks:%s", counter);
        if (counter == 0) {
            process.nextTick(function () {
                tracer.info("Next memory usage check in " + instance.config.interval + "ms");
                currentTimeout = setTimeout(check, instance.config.interval);
            });
        }
    };

    function check() {
        history.push(process.memoryUsage());
        if (history.length > instance.config.consecutiveGrowths)
            history.shift();
        tracer.log("Checking", history);
        if (history.length < instance.config.consecutiveGrowths) {
            currentTimeout = setTimeout(check, instance.config.interval);
            tracer.log("Not enough memory-usage history, skip. next memory usage check in " + instance.config.interval + "ms");
            return;
        }
        let isConsecutive = true,
            isExceeding = _.last(history).heapUsed > instance.config.memoryThreshold;
        for (var i = 1; i < history.length; i++) {
            if (history[i].heapUsed <= history[(i - 1)].heapUsed) {
                isConsecutive = false;
                break;
            }
        }
        tracer.log("IsConsecutive:", isConsecutive, "isExceeding", isExceeding, "isBlocked:", isBlocked);
        //We need to block
        if (isConsecutive && isExceeding) {
            tracer.warn("event %s", UNDER_PRESSURE), isBlocked = true, counter = emitter.listenerCount(UNDER_PRESSURE);
            if (counter == 0)
                throw new CustomError("No subscription to the event '%s'", UNDER_PRESSURE, 500, "fatal");
            let sentObj = {
                memoryUsageHistory: history,
                ack: function () {
                    ack();
                    sentObj.ack = throwError;
                }
            };
            emitter.emit(UNDER_PRESSURE, sentObj);
            return clearTimeout(currentTimeout);
        }
        //We need to deblock
        if (isBlocked && !isExceeding) {
            tracer.warn("event %s", PRESSURE_RELEASED), isBlocked = false, counter = emitter.listenerCount(PRESSURE_RELEASED);
            if (counter == 0)
                throw new CustomError("No subscription to the event '%s'", PRESSURE_RELEASED, 500, "fatal");
            let sentObj = {
                memoryUsageHistory: history,
                ack: function () {
                    ack();
                    sentObj.ack = throwError;
                }
            };
            emitter.emit(PRESSURE_RELEASED, sentObj);
            return clearTimeout(currentTimeout);
        }
        tracer.log("Next check in", instance.config.interval + "ms");
        currentTimeout = setTimeout(check, instance.config.interval);
    };

    //Start it
    process.nextTick(function () {
        currentTimeout = setTimeout(check, instance.config.interval);
    });

    pressure[name] = instance;

    return instance;
};

module.exports = pressure;