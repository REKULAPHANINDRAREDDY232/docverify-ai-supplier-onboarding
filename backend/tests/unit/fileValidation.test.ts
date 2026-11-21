import {
  assertValidUpload,
  detectMimeFromSignature,
  sanitizeOriginalFilename,
} from '../../src/lib/fileValidation';
import { PDF_BUFFER, PNG_BUFFER } from '../helpers';

describe('fileValidation unit tests', () => {
  it('detects PDF and PNG signatures', () => {
    expect(detectMimeFromSignature(PDF_BUFFER)).toBe('application/pdf');
    expect(detectMimeFromSignature(PNG_BUFFER)).toBe('image/png');
    expect(detectMimeFromSignature(Buffer.from('hello'))).toBeNull();
  });

  it('sanitizes unsafe original filenames', () => {
    expect(sanitizeOriginalFilename('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeOriginalFilename('invoice<>.pdf')).toBe('invoice__.pdf');
  });

  it('rejects empty buffers and mismatched MIME declarations', () => {
    expect(() =>
      assertValidUpload({
        buffer: Buffer.alloc(0),
        mimetype: 'application/pdf',
      } as Express.Multer.File),
    ).toThrow('Uploaded file is empty');

    expect(() =>
      assertValidUpload({
        buffer: PDF_BUFFER,
        mimetype: 'image/png',
      } as Express.Multer.File),
    ).toThrow('Declared file type does not match file contents');
  });

  it('accepts matching PDF uploads', () => {
    expect(
      assertValidUpload({
        buffer: PDF_BUFFER,
        mimetype: 'application/pdf',
        size: PDF_BUFFER.length,
      } as Express.Multer.File),
    ).toBe('application/pdf');
  });
});
