'use strict';

//
// Get and temperature from connected sensors.
//
// @chamerling
//

var fs = require('fs');

var SYS_FOLDER = '/sys/bus/w1/devices/';

function parseHexData(data) {
  var arr = data.split(' ');

  if (arr[1].charAt(0) === 'f') {
    var x = parseInt('0xffff' + arr[1].toString() + arr[0].toString(), 16);
    return (-((~x + 1) * 0.0625));
  } else if (arr[1].charAt(0) === '0') {
    return parseInt('0x0000' + arr[1].toString() + arr[0].toString(), 16) * 0.0625;
  }
  throw new Error('Can not parse data');
}

function parseDecimalData(data) {
  var arr = data.split('\n');

  if (arr[0].indexOf('YES') > -1) {
    var output = data.match(/t=(-?(\d+))/);
    return Math.round(output[1] / 100) / 10;
  } else if (arr[0].indexOf('NO') > -1) {
    return false;
  }
  throw new Error('Can not get temperature');
}

var parsers = {
  'hex': parseHexData,
  'decimal': parseDecimalData,
  'default': parseDecimalData
};

function parseData(data, options) {
  var parser = options.parser || 'default';
  if (!parsers[parser]) {
    parser = 'default';
  }
  return parsers[parser](data);
}
module.exports.parseData = parseData;

// Get all connected sensor IDs as array
// ul 2024-11-04 added support for multiple onewire masters
// @param callback(err, array)
function sensors(callback) {
  fs.readdir(SYS_FOLDER, function(err, sensor_ids) {
    if (err) {
      return callback(err);
    }
    sensor_ids = sensor_ids.filter(id => ! id.startsWith('w1_bus_master'););
    return callback(null, sensor_ids);
  });
}
module.exports.sensors = sensors;

// Get the temperature of a given sensor
// @param sensor : The sensor ID
// @param callback : callback (err, value)
function temperature(sensor, options, callback) {
  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  fs.readFile(SYS_FOLDER + sensor + '/w1_slave', 'utf8', function(err, data) {
    if (err) {
      return callback(err);
    }

    try {
      return callback(null, parseData(data, options));
    } catch(e) {
      return callback(new Error('Can not read temperature for sensor ' + sensor));
    }
  });
};
module.exports.temperature = temperature;

function temperatureSync(sensor, options) {
  options = options || {};
  var data = fs.readFileSync(SYS_FOLDER + sensor + '/w1_slave', 'utf8');
  return parseData(data, options);
};
module.exports.temperatureSync = temperatureSync;
