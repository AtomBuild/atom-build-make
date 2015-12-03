'use babel';

import fs from 'fs';
import path from 'path';

export function provideBuilder() {
  return class MakeBuildProvider {
    constructor(cwd) {
      this.cwd = cwd;
    }

    getNiceName() {
      return 'GNU Make';
    }

    isEligible() {
      return fs.existsSync(path.join(this.cwd, 'Makefile'));
    }

    settings() {
      return [ {
        name: 'GNU Make: default',
        exec: 'make',
        sh: false
      } ];
    }
  };
}
