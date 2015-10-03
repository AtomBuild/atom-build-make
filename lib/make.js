'use babel';
'use strict';

function provideBuilder() {

  var fs = require('fs');
  var path = require('path');

  return {

    niceName: 'GNU Make',

    isEligable: function (cwd) {
      return fs.existsSync(path.join(cwd, 'Makefile'));
    },

    settings: function (cwd) {

      var makefile = fs.realpathSync(path.join(cwd, 'Makefile'));

      var createBuildConfig = function(name) {
        return {
          name: 'GNU Make: ' + name,
          exec: 'make',
          args: [ name ],
          sh: false
        };
      };

      var data = fs.readFileSync(makefile, 'utf8');
      var lines = data.split(/\n/);
      var config = [];

      config.push({
        name: 'GNU Make: default',
        exec: 'make',
        sh: false
      });

      lines.forEach(function(line) {
        var m = line.match(/^([\w\-]+):/);
        if (m) {
            config.push(createBuildConfig(m[1]));
        }
      });

      return config;

    }

  };
}

module.exports.provideBuilder = provideBuilder;
