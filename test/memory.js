var pressure = require("../lib/index");
var _ = require("lodash");
var expect = require("chai").expect;
var fs = require("fs");

describe("When monitoring memory pressure", function () {

    it("monitors", function (done) {
        this.timeout(400000);
        var buff = [], t = null, states = [];

        let v = 0;

        pressure.new("default", {
            stillUnderPressure: 1,
            memoryThreshold: 50 * 1000000,
            consecutiveGrowths: 3,
            interval: 300
        }); //Override

        pressure.default.on("underPressure", function (memoryUsage) {
            states.push(0);

            if (v > 0) {
                buff = [];
                setImmediate(global.gc);
                clearInterval(t);
            }

            pressure.default.ack(); //Ready for next state
            v++;
        });

        pressure.default.on("pressureReleased", function (memoryUsage) {
            states.push(1);
            setup();
            pressure.default.ack(); //Ready for next state
        });

        let stillUnderPressure = 0;
        pressure.default.on("stillUnderPressure", function (memoryUsage) {
            stillUnderPressure++;

            buff = [];
            setImmediate(global.gc);
            clearInterval(t);

            pressure.default.ack(); //Ready for next state
        });

        function setup() {
            t = setInterval(function () {
                buff.push(JSON.parse(fs.readFileSync(__dirname + "/data.json")));
            }, 1);
        };

        setup();

        setTimeout(function () {
            console.log(states);
            expect(stillUnderPressure).to.equal(1);
            expect(states.length >= 2).to.be.ok;
            expect(states[0]).to.equal(0);
            expect(states[1]).to.equal(1);
            done();
        }, 5000);
    });
});