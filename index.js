var request = require("request"),
    Service,
    Characteristic,
    MyQDoorState;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  DoorState = homebridge.hap.Characteristic.CurrentDoorState;
  MyQDoorState = {};
  MyQDoorState.OPEN = "9",
  MyQDoorState.CLOSED = "2",
  MyQDoorState.MOVING = "8",
  MyQDoorState.TARGET_OPEN = "1",
  MyQDoorState.TARGET_CLOSED = "0";

  homebridge.registerPlatform("homebridge-myq", "MyQ", MyQ);
};

function MyQ(log, config) {
  this.log        = log;
  this.MyQApplicationId = config["MyQApplicationId"];
  this.UserAgent        = config["UserAgent"];
  this.culture          = config["culture"];
  this.BrandId          = config["BrandId"];
  this.username         = config["username"];
  this.password         = config["password"];
  this.loglevel         = config["loglevel"];
  this.devices          = [];
};

MyQ.prototype = {
  accessories: function (callback) {
    var self = this;
    
    self.log("accessories: in accessories");
    try {
      self.validatewithculture(function() {
        self.log("accessories: callback from validatewithculture");
        
        try {
          self.userDeviceDetails(function(deviceDetails) {
            try {
              self.registerAccessories(callback, deviceDetails);
            } catch (err) {
              self.log("accessories: exception in registerAccessories: " + err.message);
            }
          });
        } catch (err) {
          self.log("accessories: exception in userDeviceDetails: " + err.message);
        }
      });
    } catch (err) {
      self.log("accessories: exception in validatewithculture: " + err.message);
    }
  },
  registerAccessories: function (callback, deviceDetails) {
    var self = this;
    
    for(var i=0; i<deviceDetails["Devices"].length; i++) {
      if(deviceDetails["Devices"][i]["MyQDeviceTypeName"] == "VGDO") {
        var newDevice = new MyQGarage(self, self.log);
        newDevice.model = "VGDO";
        newDevice.serialNumber = deviceDetails["Devices"][i]["SerialNumber"];
        newDevice.myQDeviceId = deviceDetails["Devices"][i]["MyQDeviceId"];
        
        
        for(var j=0; j<deviceDetails["Devices"][i]["Attributes"].length; j++) {
          if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "desc") {
            newDevice.name = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
          } else if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "doorstate") {
            newDevice.targetdoorstate = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
            newDevice.lastdoorstate = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
            newDevice.doorstate = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
          } else if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "name") {
            newDevice.deviceId = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
          }
        }
        self.devices.push(newDevice);
      } else if(deviceDetails["Devices"][i]["MyQDeviceTypeName"] == "Gateway") {
        var newDevice = new MyQHub(self, self.log);
        newDevice.name = "MyQ Gateway";
        newDevice.model = "Gateway";
        newDevice.serialNumber = deviceDetails["Devices"][i]["SerialNumber"];
        
        for(var j=0; j<deviceDetails["Devices"][i]["Attributes"].length; j++) {
          if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "desc") {
            newDevice.displayName = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
          } else if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "name") {
            newDevice.deviceId = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
          }
        }
        self.devices.push(newDevice);
      }

    }
    
    callback(self.devices);
  },

  validatewithculture: function(callback) {
    var self = this;
    
    var queryString = {
      'appId': self.MyQApplicationId,
      'SecurityToken': self.SecurityToken,
      'username': self.username,
      'password': self.password,
      'culture': self.culture
    };
    
    try {
      request({
        "url": "https://myqexternal.myqdevice.com/api/user/validatewithculture",
        'qs': queryString,
        "method": "GET",
        "headers": {
          'User-Agent': self.UserAgent,
          'BrandId': self.BrandId,
          'Culture': self.culture,
          'MyQApplicationId': self.MyQApplicationId,
          'SecurityToken': self.SecurityToken
        }
      }, function(error, response, body) {
        try {
          var bodyJson = JSON.parse(body);
          if(bodyJson.SecurityToken) {
            self.SecurityToken = bodyJson.SecurityToken;
            self.log("Set new token [" + self.SecurityToken + "]");
          } else {
            self.log("error: " + error);
            self.log("response: " + response);
            self.log("body: " + body);
          }
          if(callback) {
            callback();
          }
        } catch (err) {
          self.log("validatewithculture: exception in response validatewithculture: " + err.message);
        }
      });
    } catch (err) {
      self.log("validatewithculture: exception in request validatewithculture: " + err.message);
    }
  },
  
  userDeviceDetails: function(callback) {
    var self = this;
        
    self.log("userDeviceDetails: starting.");
    
    var queryString = {
      'appId': self.MyQApplicationId,
      'SecurityToken': self.SecurityToken,
      'filterOn':'true',
      'format':'json',
      'nojsoncallback':'1'
    };
    
    try {
      request({
        "url": "https://myqexternal.myqdevice.com/api/v4/userdevicedetails/get",
        'qs': queryString,
        "method": "GET",
        "headers": {
          'User-Agent': self.UserAgent,
          'BrandId': self.BrandId,
          'Culture': self.culture,
          'MyQApplicationId': self.MyQApplicationId,
          'SecurityToken': self.SecurityToken
        }
      }, function(error, response, body) {
        try {
          self.log("userDeviceDetails: got api response.");
          var bodyJson = JSON.parse(body);
      
          self.log("userDeviceDetails: got results, checking callback");
          if(callback) {
            self.log("userDeviceDetails: making callback");
            callback(bodyJson);
          }        
          
          // self.log("error: " + error);
          // self.log("response: " + response);
          // self.log("body: " + body);
        } catch (err) {
          self.log("userDeviceDetails: exception in response userDeviceDetails: " + err.message);
        }
      });  
    } catch (err) {
      self.log("userDeviceDetails: exception in request userDeviceDetails: " + err.message);
    }
  },
  
  getDeviceAttribute: function(myQDeviceId, attributeName, callback) {
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
          var bodyJson = JSON.parse(body);
      
          self.log("getDeviceAttribute: got results, checking callback");
          if(callback) {
            self.log("getDeviceAttribute: making callback");
            callback(bodyJson);
          }
          
          // self.log("error: " + error);
          // self.log("response: " + response);
          // self.log("body: " + body);
        } catch (err) {
          self.log("getDeviceAttribute: exception in response getDeviceAttribute: " + err.message);
        }
      });
    } catch (err) {
      self.log("getDeviceAttribute: exception in request getDeviceAttribute: " + err.message);
    }
  },
  
  putDeviceAttribute: function(myQDeviceId, attributeName, attributeValue, callback) {
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
    
          self.log("putDeviceAttribute: got results, checking callback");
          if(callback) {
            self.log("putDeviceAttribute: making callback");
            callback(bodyJson);
          }       
        } catch (err) {
          self.log("putDeviceAttribute: exception in response putDeviceAttribute: " + err.message);
        }
      });
    } catch (err) {
      self.log("putDeviceAttribute: exception in request putDeviceAttribute: " + err.message);
    }
  
  
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
  getCurrentDoorState: function(callback) {
    var self = this;
    
    self.myQ.getDeviceAttribute(self.myQDeviceId, 'doorstate', function(jsonBody) {
      if(jsonBody["ReturnCode"] == "0") {
        self.doorstate = jsonBody["AttributeValue"];
        self.log("getCurrentDoorState: value is [%s]", self.doorstate);
        if(self.doorstate == MyQDoorState.CLOSED) {
          self.lastdoorstate = MyQDoorState.CLOSED;
          callback(null,DoorState.CLOSED);
        } else if(self.doorstate == MyQDoorState.OPEN) {
          self.lastdoorstate = MyQDoorState.OPEN;
          callback(null,DoorState.OPEN);
        } else if(self.doorstate == MyQDoorState.MOVING) {
          if(self.lastdoorstate == MyQDoorState.CLOSED) {
            callback(null,DoorState.OPENING);
          } else {
            callback(null,DoorState.CLOSING);
          }
        } else {
          callback(null,DoorState.OPEN);
        }
      }
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
  getServices: function() {
    var self = this,
        garageService = new Service.GarageDoorOpener(this.name),
        informationService = new Service.AccessoryInformation();
    
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
    
            
    return [informationService, garageService];
  }
}
