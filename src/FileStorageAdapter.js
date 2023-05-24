/**** simple filtering file storage adapter ****/

  const fs   = require('fs')
  const path = require('path')

  GUN.on('create', function (Context) {        // do not use a "fat arrow" here!
    this.to.next(Context)

    let   StorageFile = undefined
    const Filters     = []
    let   KeyHole     = {}

    let Options = Context.opt.simpleFileStorage
    switch (true) {
      case (Options ==  null):
      case (Options === false):
        return                                       // adapter wasn't requested
      case (typeof Options === 'string'):
        StorageFile = Options
        break
      case Array.isArray(Options):
        throw new TypeError('FileStorageAdapter: invalid options given')
      case (typeof Options === 'object'):
        if (typeof Options.file === 'string') {
          StorageFile = Options.file
        } else {
          throw new TypeError('FileStorageAdapter: missing or invalid storage file path')
        }

        switch (true) {
          case (Options.filter == null):
            break
          case (typeof Options.filter === 'string'):
            Filters.push(Options.filter)
            break
          case Array.isArray(Options.filter):
            Options.filter.forEach((Filter) => {
              if (typeof Filter === 'string') {
                Filters.push(Filter)
              } else {
                throw new TypeError('FileStorageAdapter: invalid filter given')
              }
            })
            break
          default:
            throw new TypeError('FileStorageAdapter: invalid filter(s) given')
        }

        if (typeof Options.keyhole === 'object') {
          KeyHole = Options.keyhole || {}
        }
        break
      default:
        throw new TypeError('FileStorageAdapter: invalid options given')
    }

    function IdIsPermitted (Id) {
      if (Filters.length === 0) { return true }
        for (let i = 0, l = Filters.length; i < l; i++) {
          const Filter = Filters[i]
          if (Filter.endsWith('/')) {
            if (Id.startsWith(Filter)) { return true }
          } else {
            if (
              (Id === Filter) || Id.startsWith(Filter + '/')
            ) { return true }
          }
        }
      return false
    }

    StorageFile = path.join(__dirname,StorageFile)   // make file spec. absolute

  /**** to speed persistence up: keep a copy of the full store in memory ****/

    let Storage = KeyHole.Storage = {}
      let Stats = fs.statSync(StorageFile, {throwIfNoEntry:false}) // may crash!
    if (Stats == null) {
      fs.writeFileSync(StorageFile,JSON.stringify(Storage))        // may crash!
    } else {
      if (! Stats.isFile) {
        throw new Error('the given storage "file" is actually not a file')
      }

      Storage = KeyHole.Storage = JSON.parse(fs.readFileSync(StorageFile)) // may crash!
    }

    KeyHole.PutCount = 0

  /**** get - retrieve the contents of a given node ****/

    Context.on('get', function (WireMessage) {           // no "fat arrow" here!
      this.to.next(WireMessage)

      let DedupId = WireMessage['#']
      let LEX     = WireMessage.get
      let Soul    = (LEX == null ? undefined : LEX['#'])
      if (Soul == null) { return }

      if (! IdIsPermitted(Soul)) {                                // "fail fast"
        Context.on('in', { '@':DedupId, err:null, put:null })
        return
      }

      let Data = KeyHole.Storage[Soul]              // fetches data from storage
      if (Data == null) {
        Context.on('in', { '@':DedupId, err:null, put:null })
      } else {
        let Key = LEX['.']
        if ((Key != null) && ! Object.plain(Key)) {
          Data = GUN.state.ify(
            {}, Key, GUN.state.is(Data,Key), Data[Key], Soul
          )
        }
      }

      Context.on('in', { '@':DedupId, ok:1, err:null, put:Data })
    })

  /**** put - patches the contents of a given node ****/

    Context.on('put', function (WireMessage) {           // no "fat arrow" here!
      this.to.next(WireMessage)

      let LEX     = WireMessage.put
      let Soul    = LEX['#'], Key  = LEX['.']
      let DedupId = WireMessage['#']
      let Ok      = WireMessage.ok || ''

      if (! IdIsPermitted(Soul)) {                                // "fail fast"
//      Context.on('in', { '@':DedupId, err:'undesired node id', ok:false })
        Context.on('in', { '@':DedupId, err:null, ok:false })
        return
      }

      KeyHole.PutCount++

      Storage[Soul] = GUN.state.ify(             // merges new data into storage
        Storage[Soul], Key, LEX['>'], LEX[':'], Soul
      )

//    try { // let GunDB deliberately crash if persistence fails!
        fs.writeFileSync(StorageFile,JSON.stringify(Storage))
        Context.on('in', { '@':DedupId, ok:true, err:null })
//    } catch (Signal) {
//      Error = 'could not write storage file: ' + Signal + (
//        Signal.stack == null ? '' : '' + Signal.stack
//      )
//
//      Context.on('in', { '@':DedupId, ok:false, err:Error })
//    }
    })
  })

