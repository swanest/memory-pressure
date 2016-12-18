var pressure = require("../lib/index");
var _ = require("lodash");
var expect = require("chai").expect;
var fs = require("fs");

process.title = "memory-pressure-test";

describe("When monitoring memory pressure", function () {

    pressure.new("default", {
        memoryThreshold: 100 * 1000000,
        consecutiveGrowths: 3,
        interval: 200
    });


    it("monitors", function (done) {
        this.timeout(400000);
        let buff = [], t = null, states = [], v = 0;


        function increaseMemoryUsage() {
            t = process.nextTick(function () {
                setInterval(function () {
                    buff.push(JSON.parse(fs.readFileSync(__dirname + "/data.json")));
                }, 1)
            });
        };

        function stopMemoryIncrease() {
            clearInterval(t);
        };

        pressure.default.on(pressure.EVENTS.UNDER_PRESSURE, function (status) {
            states.push(0);
            buff = [];
            setImmediate(global.gc);
            stopMemoryIncrease();
            status.ack(); //Ready for next state
            v++;
        });

        pressure.default.on(pressure.EVENTS.PRESSURE_RELEASED, function (status) {
            states.push(1);
            increaseMemoryUsage();
            status.ack(); //Ready for next state
        });

        increaseMemoryUsage();

        setTimeout(function () {
            expect(states.length >= 2).to.be.ok;
            expect(states[0]).to.equal(0);
            expect(states[1]).to.equal(1);
            done();
        }, 5000);

    });
});