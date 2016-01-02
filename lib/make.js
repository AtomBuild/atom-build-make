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
  buildDir: {
    title: 'Build directory',
    description: 'Build directory for out-of-source builds.',
    type: 'string',
    default: '.',
    order: 2
  },
  useMake: {
    title: 'Target extraction with make',
    description: 'Use `make` to extract targets. This may yield unwanted targets, or take a long time and a lot of resource.',
    type: 'boolean',
    default: false,
    order: 3
  },
  useCMake: {
    title: 'Use CMake to generate makefiles',
    description: 'Use `CMake` to generate makefiles (looks for \'CMakeLists.txt\' in the project or build directory).',
    type: 'boolean',
    default: false,
    order: 4
  }
};

export function provideBuilder() {
  return class MakeBuildProvider extends EventEmitter {
    constructor(cwd) {
      super();
      this.cwd = cwd;
      this.build_dir = '.';
      atom.config.observe('build-make.jobs', () => this.emit('refresh'));
    }

    getNiceName() {
      return 'GNU Make';
    }

    findMakefile() {
      return [ 'Makefile', 'GNUmakefile', 'makefile' ]
        .map(f => path.join(this.cwd, f))
        .concat([ 'Makefile', 'GNUmakefile', 'makefile' ]
          .map(f => path.join(this.build_dir, f)))
        .filter(fs.existsSync);
    }

    findCMakefile() {
      return [ 'CMakeLists.txt' ]
        .map(f => path.join(this.cwd, f))
        .concat([ 'CMakeLists.txt' ]
          .map(f => path.join(this.build_dir, f)))
        .filter(fs.existsSync);
    }

    isEligible() {
      this.build_dir = path.join(this.cwd, atom.config.get('build-make.buildDir'));
      this.files = atom.config.get('build-make.useCMake') ?
        this.findCMakefile() : this.findMakefile();
      return (this.files.length > 0 &&
        fs.existsSync(this.build_dir));
    }

    settings() {
      const args = [ `-j${atom.config.get('build-make.jobs')}` ];

      const defaultTarget = {
        exec: 'make',
        name: `GNU Make: default (no target)`,
        args: args,
        sh: false
      };

      // TODO: Revise this conditional chaining of promises below.. may not
      // be the most awesome design, but it's working ;)
      let promise = Promise.resolve(atom.config.get('build-make.useCMake'))
        .then(useCMake => {
          const cmakeCmd = 'cmake '.concat(
            this.build_dir === path.dirname(this.files[0]) ?
            '.' : path.relative(this.build_dir, path.dirname(this.files[0])) );
          return (useCMake ? voucher(exec, cmakeCmd, { cwd: this.build_dir } )
            .then( () => {
              this.files = this.findMakefile();
              return atom.config.get('build-make.useMake');
            } ) :
          atom.config.get('build-make.useMake') );
        } );

      promise = promise.then(useMake => {
        return (useMake ?
          voucher(exec, 'make -prRn', { cwd: this.build_dir }) :
          voucher(fs.readFile, this.files[0]) );
      } ); // Only take the first file

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
            cwd: this.build_dir
          })));
      }).catch(e => [ defaultTarget ]);
    }
  };
}
