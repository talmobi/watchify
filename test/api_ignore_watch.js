var test = require('tape');
var watchify = require('../');
var browserify = require('browserify');
var vm = require('vm');

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var os = require('os');
var tmpdir = path.join((os.tmpdir || os.tmpDir)(), 'watchify-' + Math.random());

var files = {
    main: path.join(tmpdir, 'main.js'),
    beep: path.join(tmpdir, 'beep.js'),
    boop: path.join(tmpdir, 'boop.js'),
    robot: path.join(tmpdir, 'node_modules', 'robot', 'index.js')
};

mkdirp.sync(tmpdir);
mkdirp.sync(path.dirname(files.robot));
fs.writeFileSync(files.main, [
    'var beep = require("./beep");',
    'var boop = require("./boop");',
    'var robot = require("robot");',
    'console.log(beep + " " + boop + " " + robot);'
].join('\n'));
fs.writeFileSync(files.beep, 'module.exports = "beep";');
fs.writeFileSync(files.boop, 'module.exports = "boop";');
fs.writeFileSync(files.robot, 'module.exports = "robot";');

test('api ignore watch', function (t) {
    t.plan(4);
    var w = watchify(browserify(files.main, watchify.args), {
        ignoreWatch: '**/be*.js'
    });
    var _timeout
    w.on('update', function () {
        clearTimeout( _timeout )
        _timeout = setTimeout( function () {
            w.bundle(function (err, src) {
                t.ifError(err);

                // the cached value of beep is used
                // because it has been ignored specifcally
                t.equal(run(src), 'beep BOOP ROBOT\n');
                w.close();
            });
        }, 500 )
    });
    w.bundle(function (err, src) {
        t.ifError(err);
        t.equal(run(src), 'beep boop robot\n');
        setTimeout(function () {
            fs.writeFileSync(files.beep, 'module.exports = "BEEP";');
            fs.writeFileSync(files.boop, 'module.exports = "BOOP";');
            fs.writeFileSync(files.robot, 'module.exports = "ROBOT";');
        }, 500);
    });
});

function run (src) {
    var output = '';
    function log (msg) { output += msg + '\n' }
    vm.runInNewContext(src, { console: { log: log } });
    return output;
}
