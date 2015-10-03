'use strict';

var temp = require('temp');
var fs = require('fs-extra');
var specHelpers = require('atom-build-spec-helpers');

describe('atom-build make provider', function() {
  var directory;
  var workspaceElement;

  beforeEach(function () {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);
    jasmine.unspy(window, 'setTimeout');
    jasmine.unspy(window, 'clearTimeout');

    waitsForPromise(function() {
      return specHelpers.vouch(temp.mkdir, 'atom-build-make-spec-').then(function (dir) {
        return specHelpers.vouch(fs.realpath, dir);
      }).then(function (dir) {
        directory = dir + '/';
        atom.project.setPaths([ directory ]);
        return Promise.all([
          atom.packages.activatePackage('build'),
          atom.packages.activatePackage('build-make')
        ]);
      });
    });
  });

  afterEach(function() {
    fs.removeSync(directory);
  });

  it('should show the build panel if Makefile exists', function() {
    expect(workspaceElement.querySelector('.build')).not.toExist();

    fs.writeFileSync(directory + 'Makefile', fs.readFileSync(__dirname + '/Makefile'));
    atom.commands.dispatch(workspaceElement, 'build:trigger');

    waitsFor(function() {
      return workspaceElement.querySelector('.build .title') &&
        workspaceElement.querySelector('.build .title').classList.contains('success');
    });

    runs(function() {
      expect(workspaceElement.querySelector('.build')).toExist();

      // To make sure it does not execute with sh (shell)
      expect(workspaceElement.querySelector('.build .output').textContent).toMatch(/Executing: make/);

      expect(workspaceElement.querySelector('.build .output').textContent).toMatch(/Surprising is the passing of time\nbut not so, as the time of passing/);
    });
  });

  it('should list the default GNU Make target in SelectListView', function () {
    expect(workspaceElement.querySelector('.build')).not.toExist();

    fs.writeFileSync(directory + 'Makefile', fs.readFileSync(__dirname + '/Makefile'));

    runs(function () {
      atom.commands.dispatch(workspaceElement, 'build:select-active-target');
    });

    waitsFor(function () {
      return workspaceElement.querySelector('.select-list li.build-target');
    });

    runs(function () {
      var list = workspaceElement.querySelectorAll('.select-list li.build-target');
      var targets = Array.prototype.slice.call(list).map(function (el) {
        return el.textContent;
      });
      expect(targets).toEqual([ 'GNU Make: default', 'GNU Make: all' ]);
    });
  });
});
