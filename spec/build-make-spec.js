'use babel';

import fs from 'fs-extra';
import temp from 'temp';
import { vouch } from 'atom-build-spec-helpers';
import { provideBuilder } from '../lib/make';
import hasbin from 'hasbin';

describe('make', () => {
  let directory;
  let builder;
  const Builder = provideBuilder();

  beforeEach(() => {
    atom.config.set('build-make.useMake', true);
    atom.config.set('build-make.jobs', 2);
    atom.config.set('build-make.useBear', false);
    waitsForPromise(() => {
      return vouch(temp.mkdir, 'atom-build-make-spec-')
        .then((dir) => vouch(fs.realpath, dir))
        .then((dir) => (directory = `${dir}/`))
        .then((dir) => builder = new Builder(dir));
    });
  });

  afterEach(() => {
    fs.removeSync(directory);
  });

  describe('when makefile exists', () => {
    beforeEach(() => {
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(`${__dirname}/Makefile`));
    });

    it('should be eligible', () => {
      expect(builder.isEligible(directory)).toBe(true);
    });

    it('should yield available targets', () => {
      waitsForPromise(() => {
        return Promise.resolve(builder.settings(directory)).then((settings) => {
          expect(settings.length).toBe(4); // default (no target), all, some_custom and Makefile

          const defaultTarget = settings[0]; // default MUST be first
          expect(defaultTarget.name).toBe('GNU Make: default (no target)');
          expect(defaultTarget.exec).toBe('make');
          expect(defaultTarget.args).toEqual([ '-j2' ]);
          expect(defaultTarget.sh).toBe(false);

          const target = settings.find(setting => setting.name === 'GNU Make: some_custom');
          expect(target.name).toBe('GNU Make: some_custom');
          expect(target.exec).toBe('make');
          expect(target.args).toEqual([ '-j2', 'some_custom' ]);
          expect(target.sh).toBe(false);
        });
      });
    });

    it('should yield a subset of all targets if it does not use make to extract targets', () => {
      atom.config.set('build-make.useMake', false);
      waitsForPromise(() => {
        expect(builder.isEligible(directory)).toBe(true);
        return Promise.resolve(builder.settings(directory)).then((settings) => {
          const targetNames = settings.map(s => s.name).sort();
          expect(targetNames).toEqual([ 'GNU Make: default (no target)', 'GNU Make: all', 'GNU Make: some_custom' ].sort());
        });
      });
    });
  });

  describe('when makefile contains duplicate targets', () => {
    beforeEach(() => {
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(`${__dirname}/Makefile.withduplicates`));
    });
    it('should yield only a single target for each duplicate entry', () => {
      atom.config.set('build-make.useMake', false); // Not using make to avoid extracting Makefile as pseudotarget
      waitsForPromise(() => {
        expect(builder.isEligible(directory)).toBe(true);
        return Promise.resolve(builder.settings(directory)).then((settings) => {
          const targetNames = settings.map(s => s.name).sort();
          expect(targetNames).toEqual([ 'GNU Make: default (no target)', 'GNU Make: all', 'GNU Make: duplicated' ].sort());
        });
      });
    });
  });

  describe('when makefile exists but make can not run', () => {
    const originalPath = process.env.PATH;
    beforeEach(() => {
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(`${__dirname}/Makefile`));
      process.env.PATH = '';
    });

    afterEach(() => {
      process.env.PATH = originalPath;
    });

    it('should be eligible', () => {
      expect(builder.isEligible(directory)).toBe(true);
    });

    it('should list the default target', () => {
      waitsForPromise(() => {
        return Promise.resolve(builder.settings(directory)).then((settings) => {
          expect(settings.length).toBe(1); // default (no target)

          const defaultTarget = settings[0]; // default MUST be first
          expect(defaultTarget.name).toBe('GNU Make: default (no target)');
          expect(defaultTarget.exec).toBe('make');
          expect(defaultTarget.args).toEqual([ '-j2' ]);
          expect(defaultTarget.sh).toBe(false);
        });
      });
    });
  });

  describe('when makefile does not exist', () => {
    it('should not be eligible', () => {
      expect(builder.isEligible(directory)).toBe(false);
    });
  });

  describe('when bear integration is enabled', () => {
    beforeEach(() => {
      atom.config.set('build-make.useBear', true);
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(`${__dirname}/Makefile`));
    });

    describe('when bear is in $PATH', () => {
      beforeEach(() => {
        spyOn(hasbin, 'sync').andReturn(true); // let's make it think bear executable is present
      });

      it('should add a new "generate compile_commands.json" target', () => {
        waitsForPromise(() => {
          return Promise.resolve(builder.settings(directory)).then((settings) => {
            const target = settings[settings.length - 1];

            expect(target.name).toBe('BEAR: compile_commands.json');
            expect(target.exec).toBe('make clean && bear make -j2');
            expect(target.args).toEqual([]);
            expect(target.sh).toBe(true);
          });
        });
      });
    });

    describe('when bear is not in $PATH', () => {
      beforeEach(() => {
        spyOn(hasbin, 'sync').andReturn(false);  // let's make it think bear executable is NOT present
      });

      it('should not create a new target', () => {
        waitsForPromise(() => {
          return Promise.resolve(builder.settings(directory)).then((settings) => {
            const target = settings.find(setting => setting.name === 'BEAR: compile_commands.json');

            expect(target).toBeUndefined();
          });
        });
      });
    });
  });
});
