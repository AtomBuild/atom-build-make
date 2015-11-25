'use babel';

import fs from 'fs-extra';
import temp from 'temp';
import { vouch } from 'atom-build-spec-helpers';
import { provideBuilder } from '../lib/make';

describe('make', () => {
  let directory;
  const builder = provideBuilder();

  beforeEach(() => {
    waitsForPromise(() => {
      return vouch(temp.mkdir, 'atom-build-make-spec-')
        .then((dir) => vouch(fs.realpath, dir))
        .then((dir) => (directory = `${dir}/`));
    });
  });

  afterEach(() => {
    fs.removeSync(directory);
  });

  describe('when makefile exists', () => {
    it('should be eligible', () => {
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(__dirname + '/Makefile'));
      expect(builder.isEligable(directory)).toBe(true);
    });

    it('should give default target', () => {
      fs.writeFileSync(directory + 'Makefile', fs.readFileSync(__dirname + '/Makefile'));
      waitsForPromise(() => {
        return Promise.resolve(builder.settings(directory)).then((settings) => {
          expect(settings.length).toBe(1);
          const s = settings[0];
          expect(s.name).toBe('GNU Make: default');
          expect(s.exec).toBe('make');
          expect(s.args).toBe(undefined);
          expect(s.sh).toBe(false);
        });
      });
    });
  });

  describe('when makefile does not exist', () => {
    it('should not be eligible', () => {
      expect(builder.isEligable(directory)).toBe(false);
    });
  });
});
