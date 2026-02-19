/**
 * Path Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { normalizePath, pathsEqual, sanitizeFilename } from '../src/path-utils.js';

describe('normalizePath', () => {
  it('should convert backslashes to forward slashes', () => {
    expect(normalizePath('C:\\Users\\foo\\bar')).toBe('C:/Users/foo/bar');
  });

  it('should leave forward slashes unchanged', () => {
    expect(normalizePath('/home/foo/bar')).toBe('/home/foo/bar');
  });

  it('should handle mixed separators', () => {
    expect(normalizePath('C:\\Users/foo\\bar')).toBe('C:/Users/foo/bar');
  });
});

describe('pathsEqual', () => {
  it('should return true for equal paths', () => {
    expect(pathsEqual('/home/user', '/home/user')).toBe(true);
  });

  it('should return true for paths with different separators', () => {
    expect(pathsEqual('C:\\foo\\bar', 'C:/foo/bar')).toBe(true);
  });

  it('should return false for different paths', () => {
    expect(pathsEqual('/home/user', '/home/other')).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(pathsEqual(null, null)).toBe(true);
    expect(pathsEqual(undefined, undefined)).toBe(true);
    expect(pathsEqual(null, undefined)).toBe(false);
    expect(pathsEqual(null, '/path')).toBe(false);
    expect(pathsEqual('/path', null)).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  describe('Windows reserved names', () => {
    it('should prefix Windows reserved device names', () => {
      expect(sanitizeFilename('nul')).toBe('_nul');
      expect(sanitizeFilename('NUL')).toBe('_NUL');
      expect(sanitizeFilename('con')).toBe('_con');
      expect(sanitizeFilename('CON')).toBe('_CON');
      expect(sanitizeFilename('prn')).toBe('_prn');
      expect(sanitizeFilename('aux')).toBe('_aux');
    });

    it('should prefix COM and LPT port names', () => {
      expect(sanitizeFilename('com1')).toBe('_com1');
      expect(sanitizeFilename('COM5')).toBe('_COM5');
      expect(sanitizeFilename('lpt1')).toBe('_lpt1');
      expect(sanitizeFilename('LPT9')).toBe('_LPT9');
    });

    it('should not prefix reserved names with extensions', () => {
      // After removing extension, baseName might be reserved
      expect(sanitizeFilename('nul')).toBe('_nul');
    });

    it('should not prefix non-reserved names that contain reserved words', () => {
      expect(sanitizeFilename('null')).toBe('null'); // "null" is not reserved, only "nul"
      expect(sanitizeFilename('console')).toBe('console');
      expect(sanitizeFilename('auxiliary')).toBe('auxiliary');
    });
  });

  describe('Invalid characters', () => {
    it('should remove path separators', () => {
      expect(sanitizeFilename('foo/bar')).toBe('foobar');
      expect(sanitizeFilename('foo\\bar')).toBe('foobar');
    });

    it('should remove Windows invalid characters', () => {
      expect(sanitizeFilename('file:name')).toBe('filename');
      expect(sanitizeFilename('file*name')).toBe('filename');
      expect(sanitizeFilename('file?name')).toBe('filename');
      expect(sanitizeFilename('file"name')).toBe('filename');
      expect(sanitizeFilename('file<name>')).toBe('filename');
      expect(sanitizeFilename('file|name')).toBe('filename');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name')).toBe('my_file_name');
      expect(sanitizeFilename('file   name')).toBe('file_name'); // multiple spaces
    });

    it('should remove leading and trailing dots', () => {
      expect(sanitizeFilename('.hidden')).toBe('hidden');
      expect(sanitizeFilename('file...')).toBe('file');
      expect(sanitizeFilename('...file...')).toBe('file');
    });
  });

  describe('Edge cases', () => {
    it('should return fallback for empty strings', () => {
      expect(sanitizeFilename('')).toBe('file');
      expect(sanitizeFilename('', 'default')).toBe('default');
    });

    it('should return fallback for null/undefined', () => {
      expect(sanitizeFilename(null as any)).toBe('file');
      expect(sanitizeFilename(undefined as any)).toBe('file');
      expect(sanitizeFilename(null as any, 'image')).toBe('image');
    });

    it('should return fallback for strings that become empty after sanitization', () => {
      expect(sanitizeFilename('...')).toBe('file');
      expect(sanitizeFilename('///\\\\\\')).toBe('file');
      expect(sanitizeFilename('???')).toBe('file');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeFilename(123 as any)).toBe('file');
      expect(sanitizeFilename({} as any)).toBe('file');
    });
  });

  describe('Normal filenames', () => {
    it('should preserve normal filenames', () => {
      expect(sanitizeFilename('document')).toBe('document');
      expect(sanitizeFilename('file123')).toBe('file123');
      expect(sanitizeFilename('my-file_name')).toBe('my-file_name');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFilename('文件')).toBe('文件');
      expect(sanitizeFilename('файл')).toBe('файл');
      expect(sanitizeFilename('café')).toBe('café');
    });
  });

  describe('Real-world examples from bug report', () => {
    it('should handle filename that might become "nul"', () => {
      // If a filename is "null.png", basename would be "null"
      expect(sanitizeFilename('null')).toBe('null'); // "null" is ok
      expect(sanitizeFilename('nul')).toBe('_nul'); // "nul" is reserved
    });

    it('should sanitize typical image filenames', () => {
      expect(sanitizeFilename('screenshot')).toBe('screenshot');
      expect(sanitizeFilename('image 1')).toBe('image_1');
      expect(sanitizeFilename('photo?.jpg')).toBe('photo.jpg'); // ? removed, . is valid
    });
  });
});
