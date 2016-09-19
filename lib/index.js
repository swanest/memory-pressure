const _ = require("lodash"),
    EventEmitter = require('events').EventEmitter,
//logLib = require("logger"),
//tracer = new logLib.Logger({namespace: "memory-pressure"}),
//CustomError = logLib.CustomError,
    pressure = new Object(),
    emitter = new EventEmitter(),
    history = [];

pressure.config = {
    thresholdRss: 200 * 1000000,
    interval: 3000,
    manualReleaseRequired: 20, //If still blocked after 20 check calls (1 min), emits `manualReleaseRequired` event
    consecutiveGrowths: 7
};

let stillBlockedCalls = 0,
    isBlocked = false;

function check() {
    history.push(process.memoryUsage());
    if (history.length > pressure.config.consecutiveGrowths)
        history.shift();

    if (history.length < pressure.config.consecutiveGrowths)
        return setTimeout(check, pressure.config.interval);

    let isConsecutive = true;
    for (var i = 1; i < history.length; i++) {
        if (history[i].rss <= history[(i - 1)].rss) {
            isConsecutive = false;
            break;
        }
    }
    if (isConsecutive && _.last(history).rss > pressure.config.thresholdRss && !isBlocked) { //block
        isBlocked = true;
        emitter.emit("underPressure", _.last(history));
    }
    else if (isBlocked && (_.last(history).rss <= pressure.config.thresholdRss)) { //deblock
        isBlocked = false;
        stillBlockedCalls = 0;
        emitter.emit("pressureReleased", _.last(history));
    }
    else if (isBlocked) {
        stillBlockedCalls++;
        if (stillBlockedCalls > pressure.config.manualReleaseRequired)
            stillBlockedCalls = 0, emitter.emit("manualReleaseRequired");
    }

    return setTimeout(check, pressure.config.interval);
};

process.nextTick(function () {
    setTimeout(check, pressure.config.interval);
});

pressure.on = emitter.on.bind(emitter);

module.exports = pressure;