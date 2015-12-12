'use babel';

import fs from 'fs-extra';
import temp from 'temp';
import { vouch } from 'atom-build-spec-helpers';
import { provideBuilder } from '../lib/make';

describe('make', () => {
  let directory;
  let builder;
  const Builder = provideBuilder();

  beforeEach(() => {
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
          expect(settings.length).toBe(4); // default (no args), all, some_custom and Makefile

          const defaultTarget = settings[0]; // default MUST be first
          expect(defaultTarget.name).toBe('GNU Make: default (no args)');
          expect(defaultTarget.exec).toBe('make');
          expect(defaultTarget.args).toBe(undefined);
          expect(defaultTarget.sh).toBe(false);

          const target = settings.find(setting => setting.name === 'GNU Make: some_custom');
          expect(target.name).toBe('GNU Make: some_custom');
          expect(target.exec).toBe('make');
          expect(target.args).toEqual([ 'some_custom' ]);
          expect(target.sh).toBe(false);
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
          expect(settings.length).toBe(1); // default (no args)

          const defaultTarget = settings[0]; // default MUST be first
          expect(defaultTarget.name).toBe('GNU Make: default (no args)');
          expect(defaultTarget.exec).toBe('make');
          expect(defaultTarget.args).toBe(undefined);
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
});
