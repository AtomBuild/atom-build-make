'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import voucher from 'voucher';
import { EventEmitter } from 'events';
import XRegExp from 'xregexp';

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
  const gccErrorMatch = new XRegExp('(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(fatal error|error):\\s*(?<message>.+)');
  const ocamlErrorMatch = new XRegExp('(?<file>[\\/0-9a-zA-Z\\._\\-]+)", line (?<line>\\d+), characters (?<col>\\d+)-(?<col_end>\\d+):\\n(?<message>.+)');
  const golangErrorMatch = new XRegExp('(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):\\s*(?<message>.*error.+)');
  const errorMatch = [ gccErrorMatch, ocamlErrorMatch, golangErrorMatch];

  // const gccWarningMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(warning):\\s*(?<message>.+)';
  // const warningMatch = [
  //   gccWarningMatch
  // ];

  function eMatch(dir, array, string) {
    errorMatch.forEach(function (regex) {
      XRegExp.forEach(string, regex, function (match) {
        // map the regex match to the error object that atom-build expects
        array.push({
          file: dir ? dir + '/' + match.file : match.file,
          line: match.line,
          col: match.col,
          col_end: match.col_end,
          message: match.message
        });
      });
    });
  }

  function functionMatch(o) {
    const enterDir = /^make\[\d+\]: Entering directory [`']([^']+)[`']$/;
    const array = [];
    let scopeBuffer = '';
    // stores the current directory
    let dir = null;
    // iterate over the output by lines
    o.split(/\r?\n/).forEach(line => {
      // update the current directory on lines with `Entering directory`
      const dirMatch = enterDir.exec(line);
      if (dirMatch) {
        // flush buffer
        eMatch(dir, array, scopeBuffer);
        scopeBuffer = '';
        // Update dir
        dir = dirMatch[1];
      } else {
        scopeBuffer += line + '\n';
      }
    });
    eMatch(dir, array, scopeBuffer);
    return array;
  }

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
        name: 'GNU Make: default (no target)',
        args: args,
        sh: false,
        functionMatch: functionMatch
      };

      const promise = atom.config.get('build-make.useMake') ?
        voucher(exec, 'make -prRn', { cwd: this.cwd }) :
        voucher(fs.readFile, this.files[0]); // Only take the first file

      return promise.then(output => {
        return [ defaultTarget ].concat(output.toString('utf8')
          .split(/[\r?\n]{1,2}/)
          .filter(line => /^[a-zA-Z0-9][^$#\/\t=]*:([^=]|$)/.test(line))
          .map(targetLine => targetLine.split(':').shift())
          .filter( (elem, pos, array) => (array.indexOf(elem) === pos) )
          .map(target => ({
            exec: 'make',
            args: args.concat([ target ]),
            name: `GNU Make: ${target}`,
            sh: false,
            functionMatch: functionMatch
          })));
      }).catch(e => [ defaultTarget ]);
    }
  };
}
