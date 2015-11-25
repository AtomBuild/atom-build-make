'use babel';

import fs from 'fs';
import path from 'path';

export function provideBuilder() {
  return {

    niceName: 'GNU Make',

    isEligable(cwd) {
      return fs.existsSync(path.join(cwd, 'Makefile'));
    },

    settings(cwd) {
      return [ {
        name: 'GNU Make: default',
        exec: 'make',
        sh: false
      } ];
    }

  };
}
