var request = require("request"),
    Service,
    Characteristic,
    MyQDoorState;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  DoorState = homebridge.hap.Characteristic.CurrentDoorState;

  homebridge.registerPlatform("homebridge-myq", "MyQ", MyQ);
};

function MyQ(log, config) {
  this.log              = log;
  this.MyQApplicationId = config["MyQApplicationId"];
  this.UserAgent        = config["UserAgent"];
  this.username         = config["username"];
  this.password         = config["password"];
  this.loglevel         = config["loglevel"];
  this.devices          = [];
};

MyQ.prototype = {
  /**
   * The accessories function is called as part of the Homebridge module initialization.
   * The purpose is to return an Array of Devices to callback which will then appear
   * inside of HomeBridge
   */
  accessories: function (callback) {
    var self = this;
    
    if(self.loglevel > 1) self.log("accessories: In accessories to initiallize");
    try {
      // the initial request is to Login to get back the SecurityToken that is
      // added to the headers of additional functions.
      self.login(function() {
        if(self.loglevel > 1) self.log("accessories: callback from login function");
        
        // After login is complete, the Account ID for the user is required to be included
        // in the URL path of requests to specific devices
        self.accountId(function() {
          if(self.loglevel > 1) self.log("accessories: callback from accountId function");
          
          // Make the query to get the Devices JSON object and pass it into the
          // final function to register them.
          if(self.loglevel > 1) self.log("accessories: calling into devices function");
          self.getDevices(function(deviceDetails) {
            if(self.loglevel > 1) self.log("accessories: callback from getDevices function");
            self.registerAccessories(callback, deviceDetails);
          });     
        });
      });
    } catch (err) {
      self.log("accessories: exception in methods: " + err.message);
    }
  },
  
  /**
   * This internal method is called by the accessories method to register
   * the hubs and garage doors into the Device Details that are passed back
   * to homebridge. The DeviceDetails array should be filled up with objects
   * of either:
   * - MyQHub - returns information about the hub
   * - MyQGarage - returns a garage that can be opened/close/queried
   */
  registerAccessories: function (callback, deviceDetails) {
    var self = this;
    
    for(var i=0; i<deviceDetails["items"].length; i++) {
      if(deviceDetails["items"][i]["device_family"] == "garagedoor") {
        var newDevice = new MyQGarage(self, self.log);
        newDevice.model = "garagedoor";
        newDevice.serialNumber = deviceDetails["items"][i]["serial_number"];
        newDevice.myQDeviceId = deviceDetails["items"][i]["serial_number"];
        newDevice.deviceId = deviceDetails["items"][i]["serial_number"];
        newDevice.name  = deviceDetails["items"][i]["name"];
        newDevice.targetdoorstate = deviceDetails["items"][i]["state"]["door_state"];
        newDevice.lastdoorstate = deviceDetails["items"][i]["state"]["door_state"];
        newDevice.doorstate = deviceDetails["items"][i]["state"]["door_state"];
        self.devices.push(newDevice);
      } else if(deviceDetails["items"][i]["device_family"] == "gateway") {
        var newDevice = new MyQHub(self, self.log);
        newDevice.name = deviceDetails["items"][i]["name"];
        newDevice.model = "Gateway";
        newDevice.serialNumber = deviceDetails["items"][i]["serial_number"];
        newDevice.displayName = deviceDetails["items"][i]["name"];
        newDevice.deviceId = deviceDetails["items"][i]["serial_number"];
        self.devices.push(newDevice);
      }
    }
        
    callback(self.devices);
  },

  /**
   * This is an internal function used as part of startup to get back a security token
   * which is set to the object as:
   *. - self.SecurityToken
   */
  login: function(callback) {
  	var self = this;
  	
    if(self.loglevel > 1) self.log("login: method start");  	
    request({
      "url": "https://api.myqdevice.com/api/v5/Login",
      "method": "POST",
      "headers": {
        'Content-Type': 'application/json',
        'User-Agent': self.UserAgent,
        'MyQApplicationId': self.MyQApplicationId
      },
      "json": true,
      "body": {'UserName':self.username,'Password':self.password}
      }, function(error, response, body) {
        try {
          if(body.SecurityToken) {
            self.SecurityToken = body.SecurityToken;
            if(self.loglevel > 0) self.log("login: Set new token [" + self.SecurityToken + "]");
          } else {
            self.log("login error: " + error);
            self.log("login response: " + response);
            self.log("login body: " + body);
          }
          if(callback) {
            callback();
          }
        } catch (err) {
            self.log("login error: " + error);
            self.log("login response: " + response);
            self.log("login body: " + body);
        }
      	
      })
      if(self.loglevel > 1) self.log("login: method complete");  	
  },
  
  /**
   * This is an internal function used as part of startup to get the user's account id
   * which is then used in the URL of subsequent REST API calls
   */
  accountId: function(callback) {
  	var self = this;
  	
    if(self.loglevel > 1) self.log("accountId: method start");  	
    request({
      "url": "https://api.myqdevice.com/api/v5/My?expand=account",
      "method": "GET",
      "headers": {
        'User-Agent': self.UserAgent,
        'MyQApplicationId': self.MyQApplicationId,
        'SecurityToken': self.SecurityToken
      },
      "json": true
      }, function(error, response, body) {
        try {
          if(body.Account.Id) {
            self.AccountId = body.Account.Id;
            if(self.loglevel > 0) self.log("login: Set new AccountId [" + self.AccountId + "]");
          } else {
            self.log("accountId error: " + error);
            self.log("accountId response: " + response);
            self.log("accountId body: " + body);
          }
          if(callback) {
            if(self.loglevel > 1) self.log("accountId: executing callback");  	
            callback();
          }
        } catch (err) {
            self.log("accountId2 error: " + err);
            self.log("accountId2 error: " + error);
            self.log("accountId2 response: " + response);
            self.log("accountId2 body: " + body);
        }
      })
      if(self.loglevel > 1) self.log("accountId: method complete");  
  },  
  
  getDevices: function(callback) {
    var self = this;
    
    if(self.loglevel > 1) self.log("getDevices: method start");  	

    request({
      "url": "https://api.myqdevice.com/api/v5.1/Accounts/" + self.AccountId + "/Devices",
      "method": "GET",
      "headers": {
        'User-Agent': self.UserAgent,
        'MyQApplicationId': self.MyQApplicationId,
        'SecurityToken': self.SecurityToken
      },
      "json": true
      }, function(error, response, body) {
        try {
          // self.log("devices got back result: " + JSON.stringify(body));
          if(body.count > 0) {
            if(callback) {
              callback(body);
            }          
          } else {
            self.log("getDevices error: " + error);
            self.log("getDevices response: " + response);
            self.log("getDevices body: " + body);
          }
        } catch (err) {
            self.log("getDevices2 error: " + err);
            self.log("getDevices2 error: " + error);
            self.log("getDevices2 response: " + response);
            self.log("getDevices2 body: " + body);
        }
      })
    if(self.loglevel > 1) self.log("getDevices: method complete");  	
  },
  
  getDeviceAttribute: function(myQDeviceId, attributeName, callback) {
  	/*
    var self = this;
        
    self.log("getDeviceAttribute: starting.");
    
    var queryString = {
      'appId': self.MyQApplicationId,
      'SecurityToken': self.SecurityToken,
      'myQDeviceId': myQDeviceId,
      'attributeName': attributeName
    };
    try {
      request({
        "url": "https://myqexternal.myqdevice.com/api/v4/deviceattribute/getdeviceattribute",
        'qs': queryString,
        "method": "GET",
        "headers": {
          'Content-Type': 'application/json',
          'User-Agent': self.UserAgent,
          'MyQApplicationId': self.MyQApplicationId,
          'SecurityToken': self.SecurityToken,
          'BrandId': self.BrandId,
          'Culture': self.culture
        }
      }, function(error, response, body) {
        try {
          self.log("getDeviceAttribute: got api response.");
          var jsonBody = JSON.parse(body);
          if(self.loglevel >= 3) {
            self.log("error: " + error);
            self.log("response: " + response);
            self.log("body: " + body);
          };
          
          if(jsonBody["ReturnCode"] == "-3333") {
            // "-3333" means the token has expired and needs to login again and
            // then retry this method.
            self.log("getDeviceAttribute: got '-3333' so trying again.");
            validatewithculture(function() {
              self.getDeviceAttribute(myQDeviceId, attributeName, callback);
            });
          } else {
            self.log("getDeviceAttribute: got results, checking callback");
            if(callback) {
              self.log("getDeviceAttribute: making callback");
              callback(jsonBody);
            }
          }  
        } catch (err) {
          self.log("getDeviceAttribute: exception in response getDeviceAttribute: " + err.message);
        }
      });
    } catch (err) {
      self.log("getDeviceAttribute: exception in request getDeviceAttribute: " + err.message);
    }
    */
  },
  
  putDeviceAttribute: function(myQDeviceId, attributeName, attributeValue, callback) {
  	/*
    var self = this;
        
    self.log("putDeviceAttribute: starting.");
    var queryString = {
      'appId': self.MyQApplicationId,
      'SecurityToken': self.SecurityToken
    };
    
    try {
      request({
        "url": "https://myqexternal.myqdevice.com/api/v4/DeviceAttribute/PutDeviceAttribute",
        'qs': queryString,
        "method": "PUT",
        "headers": {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': self.UserAgent,
          'MyQApplicationId': self.MyQApplicationId,
          'SecurityToken': self.SecurityToken,
          'BrandId': self.BrandId,
          'Culture': self.culture
        },
        body: "ApplicationId=" + encodeURIComponent(self.MyQApplicationId) 
              + "&AttributeName=" + encodeURIComponent(attributeName)
              + "&AttributeValue=" + encodeURIComponent(attributeValue)
              + "&MyQDeviceId=" + encodeURIComponent(myQDeviceId)
              + "&SecurityToken=" + encodeURIComponent(self.SecurityToken)
              + "&format=json&nojsoncallback=1"
      }, function(error, response, body) {
        try {
          self.log("putDeviceAttribute: got api response.");
          var bodyJson = JSON.parse(body);

          if(self.loglevel >= 3) {
            self.log("error: " + error);
            self.log("response: " + response);
            self.log("body: " + body);
          };
          
          if(jsonBody["ReturnCode"] == "-3333") {
            // "-3333" means the token has expired and needs to login again and
            // then retry this method.
            self.log("putDeviceAttribute: got '-3333' so trying again.");
            validatewithculture(function() {
              self.putDeviceAttribute(myQDeviceId, attributeName, attributeValue, callback);
            });
          } else {
            self.log("putDeviceAttribute: got results, checking callback");
            if(callback) {
              self.log("putDeviceAttribute: making callback");
              callback(bodyJson);
            }       
          }
        } catch (err) {
          self.log("putDeviceAttribute: exception in response putDeviceAttribute: " + err.message);
        }
      });
    } catch (err) {
      self.log("putDeviceAttribute: exception in request putDeviceAttribute: " + err.message);
    }
    */
  }
};

function MyQHub(myQ, log) {
  var self = this;
  
  self.myQ = myQ;
  self.log = log;
}

MyQHub.prototype = {
  getServices: function() {
    var self = this,
        informationService = new Service.AccessoryInformation();
        
    informationService.setCharacteristic(Characteristic.Manufacturer, "Chamberlain MyQ");
    informationService.setCharacteristic(Characteristic.Model, this.deviceId);
    informationService.setCharacteristic(Characteristic.Name, this.name);
    informationService.setCharacteristic(Characteristic.SerialNumber, this.serialNumber);
                
    return [informationService];
  }
}

function MyQGarage(myQ, log) {
  var self = this;
  
  self.myQ = myQ;
  self.log = log;
};


MyQGarage.prototype = {
  /*
  getCurrentDoorState: function(callback) {
    var self = this,
        returnDoorState = DoorState.CLOSING;
    
    self.myQ.getDeviceAttribute(self.myQDeviceId, 'doorstate', function(jsonBody) {
      var returnCode = jsonBody["ReturnCode"];
      self.log("getCurrentDoorState: return code is [%s]", returnCode);
      if(jsonBody["ReturnCode"] == "0") {
        self.doorstate = jsonBody["AttributeValue"];
        self.log("getCurrentDoorState: value is [%s]", self.doorstate);
        if(self.doorstate == MyQDoorState.CLOSED) {
          self.lastdoorstate = MyQDoorState.CLOSED;
          returnDoorState = DoorState.CLOSED;
        } else if(self.doorstate == MyQDoorState.OPEN) {
          self.lastdoorstate = MyQDoorState.OPEN;
          returnDoorState = DoorState.OPEN;
        } else if(self.doorstate == MyQDoorState.MOVING) {
          if(self.lastdoorstate == MyQDoorState.CLOSED) {
            returnDoorState = DoorState.OPENING;
          } else {
            returnDoorState = DoorState.CLOSING;
          }
        } else {
          returnDoorState = DoorState.OPEN;
        }
      }
      callback(null, returnDoorState);
    });
    
  },
  getTargetDoorState: function(callback) {
    var self = this;
    
    if(self.targetdoorstate == MyQDoorState.CLOSED) {
      callback(null,DoorState.CLOSED);
    } else if(self.targetdoorstate == MyQDoorState.OPEN) {
      callback(null,DoorState.OPEN);
    } else {
      callback(null, DoorState.CLOSED);  
    }
  },
  setTargetDoorState: function(targetState, callback) {
    var self = this;
    
    if (targetState == DoorState.OPEN && self.doorstate == MyQDoorState.CLOSED) {
      self.log("setTargetDoorState: Request to open a closed door.");
      self.targetdoorstate = MyQDoorState.OPEN;
      self.myQ.putDeviceAttribute(self.myQDeviceId, 'desireddoorstate', MyQDoorState.TARGET_OPEN, function(jsonBody) {
        if(jsonBody["ReturnCode"] == "0") {
          callback(null);
        }
      });
    } else if (targetState == DoorState.CLOSED && self.doorstate == MyQDoorState.OPEN) {
      self.log("setTargetDoorState: Request to close an open door.");
      self.targetdoorstate = MyQDoorState.CLOSED;
      self.myQ.putDeviceAttribute(self.myQDeviceId, 'desireddoorstate', MyQDoorState.TARGET_CLOSED, function(jsonBody) {
        if(jsonBody["ReturnCode"] == "0") {
          callback(null);
        }
      });
    }
  },
  */
  getServices: function() {
    var self = this,
        garageService = new Service.GarageDoorOpener(this.name),
        informationService = new Service.AccessoryInformation();
    
    /*
    garageService
      .getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', this.getCurrentDoorState.bind(this));
      
    garageService
      .getCharacteristic(Characteristic.TargetDoorState)
      .on('set', this.setTargetDoorState.bind(this))
      .on('get', this.getTargetDoorState.bind(this));
    
    informationService.setCharacteristic(Characteristic.Manufacturer, "Chamberlain MyQ");
    informationService.setCharacteristic(Characteristic.Model, this.model);
    informationService.setCharacteristic(Characteristic.Name, this.deviceId);
    informationService.setCharacteristic(Characteristic.SerialNumber, this.serialNumber);
    */
            
    return [informationService, garageService];
  }
}
