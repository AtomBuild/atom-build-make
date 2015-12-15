'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import voucher from 'voucher';

export function provideBuilder() {
  return class MakeBuildProvider {
    constructor(cwd) {
      this.cwd = cwd;
    }

    getNiceName() {
      return 'GNU Make';
    }

    isEligible() {
      return [ 'Makefile', 'GNUmakefile', 'makefile' ]
        .map(f => path.join(this.cwd, f))
        .filter(fs.existsSync)
        .length > 0;
    }

    settings() {
      const defaultTarget = {
        exec: 'make',
        name: `GNU Make: default (no args)`,
        sh: false
      };

      return voucher(exec, 'make -prRn', { cwd: this.cwd }).then(output => {
        return [ defaultTarget ].concat(output.toString('utf8')
          .split(os.EOL)
          .filter(line => /^[a-zA-Z0-9][^$#\/\t=]*:([^=]|$)/.test(line))
          .map(targetLine => targetLine.split(':').shift())
          .map(target => ({
            exec: 'make',
            args: [ target ],
            name: `GNU Make: ${target}`,
            sh: false
          })));
      }).catch(e => [ defaultTarget ]);
    }
  };
}
