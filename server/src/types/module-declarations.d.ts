// Declare modules without type definitions
declare module 'multer' {
  import { Request } from 'express';

  interface FileFilterCallback {
    (error: Error | null, acceptFile: boolean): void;
  }

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface DiskStorageOptions {
    destination?:
      | string
      | ((
          req: any,
          file: any,
          callback: (error: null, destination: string) => void
        ) => void);
    filename?: (
      req: any,
      file: any,
      callback: (error: null, filename: string) => void
    ) => void;
  }

  interface StorageEngine {}

  interface DiskStorage extends StorageEngine {
    _handleFile: (
      req: Request,
      file: File,
      callback: (error: Error | null, info?: Partial<File>) => void
    ) => void;
    _removeFile: (
      req: Request,
      file: File,
      callback: (error: Error | null) => void
    ) => void;
  }

  interface Multer {
    single(fieldName: string): any;
    array(fieldName: string, maxCount?: number): any;
    fields(fields: Array<{ name: string; maxCount?: number }>): any;
    none(): any;
  }

  namespace multer {
    function diskStorage(options: DiskStorageOptions): DiskStorage;
    function memoryStorage(): StorageEngine;
    interface FileFilterCallback {
      (error: Error | null, acceptFile: boolean): void;
    }
  }

  function multer(options?: any): Multer;
  export = multer;
}
