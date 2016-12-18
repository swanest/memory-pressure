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
        this.timeout(10000);
        let buff = [], t = null, states = [], v = 0;

        function increaseMemoryUsage() {
            setInterval(function () {
                fs.readFile(__dirname + "/data.json", function (err, contents) {
                    buff.push(JSON.parse(contents));
                });
            }, 1)
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

        pressure.default.on(pressure.EVENTS.UNDER_PRESSURE, function (status) {
            status.ack(); //Ready for next state
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
        }, 5000)


    });
});