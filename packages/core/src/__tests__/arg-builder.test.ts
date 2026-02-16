import { describe, it, expect } from '@jest/globals';
import { ArgBuilder } from '../arg-builder.js';

describe('ArgBuilder', () => {
  it('should build empty args array', () => {
    const builder = new ArgBuilder();
    expect(builder.build()).toEqual([]);
  });

  it('should add single argument', () => {
    const builder = new ArgBuilder();
    builder.arg('extension');
    expect(builder.build()).toEqual(['extension']);
  });

  it('should add multiple arguments', () => {
    const builder = new ArgBuilder();
    builder.arg(['extension', 'create']);
    expect(builder.build()).toEqual(['extension', 'create']);
  });

  it('should add flag', () => {
    const builder = new ArgBuilder();
    builder.flag('--json');
    expect(builder.build()).toEqual(['--json']);
  });

  it('should add option with value', () => {
    const builder = new ArgBuilder();
    builder.option('--publisher', 'myPublisher');
    expect(builder.build()).toEqual(['--publisher', 'myPublisher']);
  });

  it('should not add option with undefined value', () => {
    const builder = new ArgBuilder();
    builder.option('--publisher', undefined);
    expect(builder.build()).toEqual([]);
  });

  it('should conditionally add arguments', () => {
    const builder = new ArgBuilder();
    builder.argIf(true, 'extension').argIf(false, 'should-not-appear');
    expect(builder.build()).toEqual(['extension']);
  });

  it('should chain multiple operations', () => {
    const builder = new ArgBuilder();
    builder
      .arg(['extension', 'create'])
      .flag('--json')
      .option('--publisher', 'myPublisher')
      .optionIf(true, '--extension-id', 'myExtension')
      .optionIf(false, '--should-not-appear', 'value');

    expect(builder.build()).toEqual([
      'extension',
      'create',
      '--json',
      '--publisher',
      'myPublisher',
      '--extension-id',
      'myExtension',
    ]);
  });

  it('should parse line into args', () => {
    const builder = new ArgBuilder();
    builder.line('extension create --json');
    expect(builder.build()).toEqual(['extension', 'create', '--json']);
  });
});
