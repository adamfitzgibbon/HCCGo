var Application = require('spectron').Application
var assert = require('assert')

describe('application launch', function () {
  this.timeout(30000);

  beforeEach(function () {
    this.app = new Application({
      path: './node_modules/.bin/electron',
      args: ['HCCGo/main.js']
    })
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it('shows an initial window', function () {
    return this.app.client.getWindowCount().then(function (count) {
      assert.equal(count, 2)
    })
  })
})