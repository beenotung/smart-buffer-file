# smart-buffer-file

A file-based Buffer wrapper that adds automatic read & write offset tracking, string operations, and more.

Inspired from [smart-buffer](https://github.com/JoshGlazebrook/smart-buffer)

[![npm Package Version](https://img.shields.io/npm/v/smart-buffer-file.svg)](https://www.npmjs.com/package/smart-buffer-file)

**Key Features**:
* Proxies all of the Buffer write and read functions
* Keeps track of read and write offsets automatically
* Grows the underneath File as needed
* Useful string operations. (Null terminating strings)
* Allows for reading/writing values at specific points in the File (random access)
* Support sync and async version
* Built in TypeScript (with Type Definitions)
* Full test coverage

**Supported Format**:
- Int8
- Int16BE
- Int16LE
- Int32BE
- Int32LE
- BigInt64BE
- BigInt64LE
- UInt8
- UInt16BE
- UInt16LE
- UInt32BE
- UInt32LE
- BigUInt64BE
- BigUInt64LE
- FloatBE
- FloatLE
- DoubleBE
- DoubleLE

**Requirements**:
* sync mode works since Node v0.1.21+
* async mode works since Node v10.0+

## Tests
- [x] sequential read/write objects with msgpack
- [ ] full test suit based on smart-buffer

## License
[BSD 2-Clause License](./LICENSE)
