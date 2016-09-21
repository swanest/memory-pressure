const _ = require("lodash"),
    EventEmitter = require('events').EventEmitter;
//logLib = require("logger"),
//tracer = new logLib.Logger({namespace: "memory-pressure"}),
//CustomError = logLib.CustomError,

var pressure = new Object();

pressure.new = function (name = "default", config = null) {
    if (name == "new")
        throw new Error("'new' is a reserved name. cannot be used as memory monitoring instance name");

    if (!_.isPlainObject(config))
        config = {};

    _.defaults(config, {
        thresholdRss: 200 * 1000000,
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

    function check() {
        history.push(process.memoryUsage());
        if (history.length > instance.config.consecutiveGrowths)
            history.shift();

        if (history.length < instance.config.consecutiveGrowths)
            return (currentTimeout = setTimeout(check, instance.config.interval));

        let isConsecutive = true;
        for (var i = 1; i < history.length; i++) {
            if (history[i].rss <= history[(i - 1)].rss) {
                isConsecutive = false;
                break;
            }
        }
        if (isConsecutive && _.last(history).rss > instance.config.thresholdRss && !isBlocked) { //block
            isBlocked = true;
            emitter.emit("underPressure", _.last(history));
        }
        else if (isBlocked && (_.last(history).rss <= instance.config.thresholdRss)) { //deblock
            isBlocked = false;
            stillBlockedCalls = 0;
            emitter.emit("pressureReleased", _.last(history));
        }
        else if (isBlocked) {
            stillBlockedCalls++;
            if (stillBlockedCalls > instance.config.manualReleaseRequired)
                stillBlockedCalls = 0, emitter.emit("manualReleaseRequired");
        }
        currentTimeout = setTimeout(check, instance.config.interval);
    };

    process.nextTick(function () {
        currentTimeout = setTimeout(check, instance.config.interval);
    });

    instance.on = emitter.on.bind(emitter);
    instance.clear = function () {
        clearTimeout(currentTimeout);
    };
    pressure[name] = instance;
    return instance;
};

pressure.new();

module.exports = pressure;