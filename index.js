var request = require("request"),
    Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("homebridge-myq", "MyQ", MyQ);
};

function MyQ(log, config) {
  this.log        = log;
  this.MyQApplicationId = config["MyQApplicationId"];
  this.SecurityToken    = config["SecurityToken"];
  this.culture          = config["culture"];
  this.BrandId          = config["BrandId"];
  this.username         = config["username"];
  this.password         = config["password"];
  this.loglevel         = config["loglevel"];
  this.devices          = [];
  
  this.validatewithculture();
};

MyQ.prototype = {
  validatewithculture: function() {
    var self = this;
    
    /*
    curl  -H  "https://myqexternal.myqdevice.com/api/user/validatewithculture?appId=NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx%2BxT4PCM5Kx&SecurityToken=85f8c558-04c6-4d09-a8bc-2e799aa9b850&username=nospam%40chaosserver.net&password=0p33nt3hgrge&culture=en"
    */
    var queryString = {
      'appId': self.MyQApplicationId,
      'SecurityToken': self.SecurityToken,
      'username': self.username,
      'password': self.password,
      'culture': self.culture
    };
    request({
      "url": "https://myqexternal.myqdevice.com/api/user/validatewithculture",
      'qs': queryString,
      "method": "GET",
      "headers": {
        'Content-Type': 'application/json',
        'User-Agent': 'Chamberlain/2793 (iPhone; iOS 9.3; Scale/2.00)',
        'BrandId': self.BrandId,
        'Culture': self.culture,
        'MyQApplicationId': self.MyQApplicationId,
        'SecurityToken': self.SecurityToken
      }
    }, function(error, response, body) {
      self.log("error: " + error);
      self.log("response: " + response);
      self.log("body: " + body);
    });
  
  },
  accessories: function (callback) {
    var self = this;
    
    self.log("in accessories");
    // self.search(function() { self.registerAccessories(callback) });
  }
};

function MyQGarage(myQ, log) {
  var self = this;
  
};