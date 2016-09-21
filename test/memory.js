var pressure = require("../lib/index");
var _ = require("lodash");
var expect = require("chai").expect;
var fs = require("fs");

describe("When monitoring memory pressure", function () {

    it("monitors", function (done) {
        this.timeout(400000);
        var buff = [], t = null, states = [];
        pressure.default.on("underPressure", function (memoryUsage) {
            states.push(0);
            buff = [];
            setImmediate(global.gc);
            clearInterval(t);
        });
        pressure.default.on("pressureReleased", function (memoryUsage) {
            states.push(1);
            setup();
        });
        pressure.default.on("manualReleaseRequired", _.noop);

        function setup() {
            t = setInterval(function () {
                buff.push(JSON.parse(fs.readFileSync(__dirname + "/data.json")));
            }, 1);
        };
        setup();
        setTimeout(function () {
            expect(states.length >= 2).to.be.ok;
            expect(states[0]).to.equal(0);
            expect(states[1]).to.equal(1);
            done();
        }, 30000);
    });
});