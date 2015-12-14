'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import voucher from 'voucher';

export const config = {
  useMake: {
    title: 'Target extraction with make',
    description: 'Use `make` to extract targets. This may yield unwanted targets, or take a long time and a lot of resource.',
    type: 'boolean',
    default: false,
    order: 1
  }
};

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
      const defaultTarget = {
        exec: 'make',
        name: `GNU Make: default (no args)`,
        sh: false
      };

      const promise = atom.config.get('build-make.useMake') ?
        voucher(exec, 'make -prRn', { cwd: this.cwd }) :
        voucher(fs.readFile, path.join(this.cwd, 'Makefile'));

      return promise.then(output => {
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
