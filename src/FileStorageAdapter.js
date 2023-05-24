/**** simple file storage adapter ****/

  const fs   = require('fs')
  const path = require('path')

  GUN.on('create', function (Context) {        // do not use a "fat arrow" here!
    this.to.next(Context)

    let StorageFile = Context.opt.simpleFileStorage
    if (StorageFile == null) { return }              // adapter wasn't requested

    StorageFile = path.join(__dirname,StorageFile)   // make file spec. absolute

  /**** to speed persistence up: keep a copy of the full store in memory ****/

    let Storage
      let Stats = fs.statSync(StorageFile, {throwIfNoEntry:false}) // may crash!
    if (Stats == null) {
      Storage = {}
      fs.writeFileSync(StorageFile,JSON.stringify(Storage))        // may crash!
    } else {
      if (! Stats.isFile) {
        throw new Error('the given storage "file" is actually not a file')
      }

      Storage = JSON.parse(fs.readFileSync(StorageFile))           // may crash!
    }

  /**** get - retrieve the contents of a given node ****/

    Context.on('get', function (WireMessage) {           // no "fat arrow" here!
      this.to.next(WireMessage)

      let DedupId = WireMessage['#']
      let LEX     = WireMessage.get
      let Soul    = (LEX == null ? undefined : LEX['#'])
      if (Soul == null) { return }

      let Data = Storage[Soul]                      // fetches data from storage
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
      }
    })
  })

