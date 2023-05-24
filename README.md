# gundb-simple-file-storage-adapter #

a trivial file storage adapter for GunDB

This repository contains an extremely simple [GunDB](https://github.com/amark/gun) storage adapter which persists incoming nodes in a single JSON file on the file system. It cannot be used in the browser but is meant for Node.js

The adapter should not be used in production (as the implementation does not scale) but could probably serve as a starting point for other developments.

> **Important**: this storage adapter is not yet finished and its documentation still has to be written. The plan is to finish everything by end of June, 2023

## Usage ##

Copy the contents of file [simpleFileStorageAdapter.js](./src/simpleFileStorageAdapter.js) into your Node.js script right after importing GunDB itself

```
const GUN = require('gun')     // this includes built-in adapters and demon mode

;(() => {
  ... insert simpleFileStorageAdapter here
})()

;(async () => {
  ... and here comes your code
})()
```

Then create your GunDB instance with the following options (among others, if need be):

```
  const Gun = GUN({
    simpleFileStorage:'TestStore.json'
  })
```

i.e., pass the file system path of the file which will keep all persisted nodes (using `.json` as a file name suffix is recommended but not required)

From now on, work with GunDB as usual - your nodes will be persisted in the configured file.

## Example ##

Here is a simple example

```
const GUN = require('gun')     // this includes built-in adapters and demon mode

;(() => {
  ... insert simpleFileStorageAdapter here
})()

;(async () => {
  const Gun = GUN({
    simpleFileStorage:'TestStore.json',
  })

/**** writeNestedNodes - recursively creates nested nodes ****/

  function writeNestedNodes (Context, Base = 10, Depth = 3, BaseKey = '') {
    for (let i = 0; i < Base; i++) {
      const currentKey     = (BaseKey === '' ? '' : BaseKey + '/') + i
      const currentContext = Context.get(''+i)

      currentContext.put({ value:currentKey })

      if (Depth > 1) {
        writeNestedNodes(currentContext,Base,Depth-1,currentKey)
      }
    }
  }

/**** create nested nodes and persist them ****/

  writeNestedNodes(Gun)
})()
```

## License ##

[MIT License](LICENSE.md)
