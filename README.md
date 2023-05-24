# gundb-simple-file-storage-adapter #

a simple file storage adapter for GunDB

This repository contains an extremely simple [GunDB](https://github.com/amark/gun) storage adapter which persists incoming nodes in a single JSON file on the file system. It cannot be used in the browser but is meant for Node.js

The adapter should not be used in production (as the implementation does not scale) but could probably serve as a starting point for other developments.

> Nota bene: there a few (probably controversal) design decisions which have been made when developing the `simpleFileStorageAdapter`:
>
> * if the configured storage file does not yet exist, it will be created on-the-fly
> * the storage adapter immediately crashes if an already existing storage file cannot be read (or does not contain proper JSON)
> * it also crashes if the storage file can not be written at runtime
> * the storage file is deliberately written _synchronously_ (because GunDB gives no runtime feedback whether persistence has succeeded or not - for that reason, this adapter simply holds GunDB until persistence has succeeded)
>
> Reason: GunDB is still a "database" which means that clients have a right to demand their data to be handled reliably!

### Special Features ###

Albeit simple, the `simpleFileStorageAdapter` already provides the following features:

* it allows for "node id filtering", which means that it can be configured to persist only those nodes that belong to one or multiple given "containment trees" (and ignore any others)
* it offers a "keyhole" which can be used to inspect some adapter internals (currently, it simply counts all actually processed "put" requests and provides a reference to the internally cached node set)

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

### Non-filtering Mode ###

Then create your GunDB instance with the following options (among others, if need be):

```
  const Gun = GUN({
    simpleFileStorage:'TestStore.json'
  })
```

i.e., pass the file system path of the file which will keep all persisted nodes (using `.json` as a file name suffix is recommended but not required)

From now on, work with GunDB as usual - your nodes will be persisted in the configured file.

### Filtering Mode ###

If you want to restrict persisting to only nodes that belong to one or multiple "containment trees" (i.e., nodes with ids that start with a given prefix) you may configure the storage adapter with one or multiple id prefixes.

Depending on whether such a prefix ends with a slash (`/`), the "root" of such a containment subtree will also be persisted or not:

* `'a/b/c'` will persist both the node `'a/b/c'` and all inner ones `'a/b/c/...'`, whereas
* `'a/b/c/'` will persist the inner nodes `'a/b/c/...'` only

If you need a single filtering prefix only, you may specify that string directly

```
  const Gun = GUN({
     simpleFileStorage: {
       file:   'TestStore.json',
       filter: 'a/b/c/'
     }
  })
```

Otherwise specify an array containing all desired prefixes:

```
  const Gun = GUN({
     simpleFileStorage: {
       file:   'TestStore.json',
       filter: ['a/b/c/','1/2/3']
     }
  })
```

### Keyhole Configuration ###

For testing and evaluation purposes, the `simpleFileStorageAdapter` also gives access to some of its internals. In order to activate that feature, simply prepare an empty JavaScript object and pass it as a `keyhole` option as part of ypur configuration

```
  const Keyhole = {}
  
  const Gun = GUN({
     simpleFileStorage: {
       file:    'TestStore.json',
       filter:  ['a/b/c/','1/2/3'],
       keyhole: Keyhole
     }
  })
```

The example shown below will show you how to work with the contents written into `Keyhole`

> Warning: you will get direct access to both 'PutCount' and the 'Storage' itself - be careful when accessing it!

## Example ##

Here is a simple example which also demonstrates the mismatch between the completion of a GunDB `put` call and the actual persistence on disk

```
const GUN = require('gun')     // this includes built-in adapters and demon mode

;(() => {
  ... insert simpleFileStorageAdapter here
})()

;(async () => {
  let KeyHole = {}

  const Gun = GUN({
    peers:[],
    simpleFileStorage:{
      file:   'TestStore.json',
      keyhole:KeyHole              // will be filled with some adapter internals
    },
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

/**** wait a given number of milliseconds ****/

  async function waitFor (Duration) {
    return new Promise((resolve,reject) => {
      setTimeout(resolve,Duration)
    })
  }

/**** create nested nodes and check persistence ****/

  writeNestedNodes(Gun)

/**** wait until persistence has settled ****/

  let lastPutCount = -1
  while (lastPutCount !== KeyHole.PutCount) {
    lastPutCount = KeyHole.PutCount
    console.log('PutCount',lastPutCount)

    await waitFor(1000)
  }

/**** then check if EVERY node has been persisted ****/

  console.log('checking for completeness...')

  let StorageKeySet = {}
    Object.keys(KeyHole.Storage).forEach((Key) => {
      StorageKeySet[Key] = true
    })
  function validateKeys (Base = 10, Depth = 3, BaseKey = '') {
    for (let i = 0; i < Base; i++) {
      const currentKey = (BaseKey === '' ? '' : BaseKey + '/') + i
      if (! (currentKey in StorageKeySet)) {
        console.log('did not persist node with key',currentKey)
      }

      if (Depth > 1) {
        validateKeys(Base,Depth-1,currentKey)
      }
    }
  }
  validateKeys()

  console.log('...done')
})()
```

## License ##

[MIT License](LICENSE.md)
