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
      return [ {
        name: 'GNU Make: default',
        exec: 'make',
        sh: false
      } ];
    }

  };
}

module.exports.provideBuilder = provideBuilder;
