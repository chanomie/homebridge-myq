var request = require("request"),
    Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  DoorState = homebridge.hap.Characteristic.CurrentDoorState;

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
    self.validatewithculture(function() {
      self.log("accessories: callback from validatewithculture");
      self.userDeviceDetails(function(deviceDetails) {
        self.registerAccessories(callback, deviceDetails);
      });
    });
  },
  registerAccessories: function (callback, deviceDetails) {
    var self = this;
    
    for(var i=0; i<deviceDetails["Devices"].length; i++) {
      if(deviceDetails["Devices"][i]["MyQDeviceTypeName"] == "VGDO") {
        var newDevice = new MyQGarage(self, self.log);
        newDevice.model = "VGDO";
        newDevice.serialNumber = deviceDetails["Devices"][i]["SerialNumber"];
        
        for(var j=0; j<deviceDetails["Devices"][i]["Attributes"].length; j++) {
          if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "desc") {
            newDevice.name = deviceDetails["Devices"][i]["Attributes"][j]["Value"];
          } else if(deviceDetails["Devices"][i]["Attributes"][j]["AttributeDisplayName"] == "doorstate") {
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
    request({
      "url": "https://myqexternal.myqdevice.com/api/user/validatewithculture",
      'qs': queryString,
      "method": "GET",
      "headers": {
        'Content-Type': 'application/json',
        'User-Agent': self.UserAgent,
        'BrandId': self.BrandId,
        'Culture': self.culture,
        'MyQApplicationId': self.MyQApplicationId,
        'SecurityToken': self.SecurityToken
      }
    }, function(error, response, body) {
      var bodyJson = JSON.parse(body);
      if(bodyJson.SecurityToken) {
        self.SecurityToken = bodyJson.SecurityToken;
        self.log("Set new token [" + self.SecurityToken + "]");
        if(callback) {
          callback();
        }
      } else {
        self.log("error: " + error);
        self.log("response: " + response);
        self.log("body: " + body);
      }
    });
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
    request({
      "url": "https://myqexternal.myqdevice.com/api/v4/userdevicedetails/get",
      'qs': queryString,
      "method": "GET",
      "headers": {
        'Content-Type': 'application/json',
        'User-Agent': self.UserAgent,
        'BrandId': self.BrandId,
        'Culture': self.culture,
        'MyQApplicationId': self.MyQApplicationId,
        'SecurityToken': self.SecurityToken
      }
    }, function(error, response, body) {
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
    });  
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
    
    self.log("getCurrentDoorState: value is [%s]", self.doorstate);
    if(self.doorstate == "2") {
      callback(null,DoorState.CLOSED);
    } else {
      callback(null,DoorState.OPEN);
    }
  },
  getServices: function() {
    var self = this,
        garageService = new Service.GarageDoorOpener(this.name),
        informationService = new Service.AccessoryInformation();
    
    garageService
      .getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', this.getCurrentDoorState.bind(this));
    
    informationService.setCharacteristic(Characteristic.Manufacturer, "Chamberlain MyQ");
    informationService.setCharacteristic(Characteristic.Model, this.model);
    informationService.setCharacteristic(Characteristic.Name, this.deviceId);
    informationService.setCharacteristic(Characteristic.SerialNumber, this.serialNumber);
    
    /*  
    garageService
      .addCharacteristic(Characteristic.TargetDoorState)
      .on('get', this.getTargetDoorState.bind(this))
      .on('set', this.setTargetDoorState.bind(this));
    */
            
    return [informationService, garageService];
  }
}
