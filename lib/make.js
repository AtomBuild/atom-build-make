'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import voucher from 'voucher';
import { EventEmitter } from 'events';

export const config = {
  jobs: {
    title: 'Simultaneous jobs',
    description: 'Limits how many jobs make will run simultaneously. Defaults to number of processors. Set to 1 for default behavior of make.',
    type: 'number',
    default: os.cpus().length,
    minimum: 1,
    maximum: os.cpus().length,
    order: 1
  },
  useMake: {
    title: 'Target extraction with make',
    description: 'Use `make` to extract targets. This may yield unwanted targets, or take a long time and a lot of resource.',
    type: 'boolean',
    default: false,
    order: 2
  }
};

export function provideBuilder() {
    const errorMatch = [
        '(?<file>[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(error|warning):\\s*(?<message>.+)'
    ];

  return class MakeBuildProvider extends EventEmitter {
    constructor(cwd) {
      super();
      this.cwd = cwd;
      atom.config.observe('build-make.jobs', () => this.emit('refresh'));
    }

    getNiceName() {
      return 'GNU Make';
    }

    isEligible() {
      this.files = [ 'Makefile', 'GNUmakefile', 'makefile' ]
        .map(f => path.join(this.cwd, f))
        .filter(fs.existsSync);
      return this.files.length > 0;
    }

    settings() {
      const args = [ `-j${atom.config.get('build-make.jobs')}` ];

      const defaultTarget = {
        exec: 'make',
        name: `GNU Make: default (no target)`,
        args: args,
        sh: false,
        errorMatch: errorMatch
    };

      const promise = atom.config.get('build-make.useMake') ?
        voucher(exec, 'make -prRn', { cwd: this.cwd }) :
        voucher(fs.readFile, this.files[0]); // Only take the first file

      return promise.then(output => {
        return [ defaultTarget ].concat(output.toString('utf8')
          .split(/[\r\n]{1,2}/)
          .filter(line => /^[a-zA-Z0-9][^$#\/\t=]*:([^=]|$)/.test(line))
          .map(targetLine => targetLine.split(':').shift())
          .map(target => ({
            exec: 'make',
            args: args.concat([ target ]),
            name: `GNU Make: ${target}`,
            sh: false,
            errorMatch: errorMatch
          })));
      }).catch(e => [ defaultTarget ]);
    }
  };
}
