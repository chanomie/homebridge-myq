var request = require("request"),
    Service,
    Characteristic;

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

// open, opening, closed, closing

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
        newDevice.myQ = self;
        newDevice.serialNumber = deviceDetails["items"][i]["serial_number"];
        newDevice.myQDeviceId = deviceDetails["items"][i]["serial_number"];
        newDevice.deviceId = deviceDetails["items"][i]["serial_number"];
        newDevice.name  = deviceDetails["items"][i]["name"];
        newDevice.doorstate = deviceDetails["items"][i]["state"]["door_state"];
        newDevice.targetdoorstate = deviceDetails["items"][i]["state"]["door_state"];
        self.devices.push(newDevice);
      } else if(deviceDetails["items"][i]["device_family"] == "gateway") {
        var newDevice = new MyQHub(self, self.log);
        newDevice.name = deviceDetails["items"][i]["name"];
        newDevice.model = "Gateway";
        newDevice.myQ = self;
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
    var self = this,
        returnDoorState = DoorState.CLOSED,
        requestUrl = "https://api.myqdevice.com/api/v5.1/Accounts/" + self.myQ.AccountId 
                     + "/Devices/" + self.myQDeviceId;
    
    if(self.myQ.loglevel > 1) self.log("getCurrentDoorState: method start");
    if(self.myQ.loglevel > 1) self.log("getCurrentDoorState: request url: " + requestUrl);
    

    request({
      "url": requestUrl,
      "method": "GET",
      "headers": {
        'User-Agent': self.myQ.UserAgent,
        'MyQApplicationId': self.myQ.MyQApplicationId,
        'SecurityToken': self.myQ.SecurityToken
      },
      "json": true
      }, function(error, response, body) {
        try {
          if(body.state.door_state) {
            self.doorstate = body.state.door_state;
            if(self.myQ.loglevel > 1) self.log("getCurrentDoorState: Door State: " 
                + self.name + " - " + self.doorstate);

            if(self.doorstate == "open") {
              returnDoorState = DoorState.OPEN;
            } else if(self.doorstate == "close") {
              returnDoorState = DoorState.CLOSE;
            } else if(self.doorstate == "opening") {
              returnDoorState = DoorState.OPENING;
            } else if(self.doorstate == "closing") {
              returnDoorState = DoorState.CLOSING;
            }
            
            if(callback) {
              callback(null, returnDoorState);
            }          
          } else {
            self.log("getCurrentDoorState error: " + error);
            self.log("getCurrentDoorState response: " + response);
            self.log("getCurrentDoorState body: " + body);
          }
        } catch (err) {
            self.log("getCurrentDoorState2 error: " + err);
            self.log("getCurrentDoorState2 error: " + error);
            self.log("getCurrentDoorState2 response: " + response);
            self.log("getCurrentDoorState2 body: " + body);
        }
      })
    if(self.myQ.loglevel > 1) self.log("getCurrentDoorState: method complete");  	    
  },
  
  getTargetDoorState: function(callback) {
    var self = this;
    
    if(self.targetdoorstate == "closed") {
      callback(null,DoorState.CLOSED);
    } else if(self.targetdoorstate == "open") {
      callback(null,DoorState.OPEN);
    } else {
      callback(null, DoorState.CLOSED);  
    }
  },
  setTargetDoorState: function(targetState, callback) {
    var self = this,    
        requestUrl = "https://api.myqdevice.com/api/v5.1/Accounts/" + self.myQ.AccountId 
                     + "/Devices/" + self.myQDeviceId + "/actions";
    
    if (targetState == DoorState.OPEN && self.doorstate == "closed") {
      if(self.myQ.loglevel > 0) self.log("setTargetDoorState: Request to open a closed door.");
      if(self.myQ.loglevel > 1) self.log("setTargetDoorState: URL: " + requestUrl)
      self.targetdoorstate = "open";

      request({
        "url": requestUrl,
        "method": "PUT",
        "headers": {
          'User-Agent': self.myQ.UserAgent,
          'Content-Type': 'application/json',          
          'MyQApplicationId': self.myQ.MyQApplicationId,
          'SecurityToken': self.myQ.SecurityToken,
          "body": {'action_type':'open'}
          },
        "json": true
        }, function(error, response, body) {
            // self.log("getCurrentDoorState error: " + JSON.stringify(error));
            self.log("getCurrentDoorState response: " + JSON.stringify(response));
            self.log("getCurrentDoorState body: " + JSON.stringify(body));
          if(error) {
            self.log("getCurrentDoorState error: " + error);
            self.log("getCurrentDoorState response: " + response);
            self.log("getCurrentDoorState body: " + body);
          } else {
            callback(null)
          }
        }
      );
            
    } else if (targetState == DoorState.CLOSED && self.doorstate == "open") {
      if(self.myQ.loglevel > 0) self.log("setTargetDoorState: Request to close an open door.");
      if(self.myQ.loglevel > 1) self.log("setTargetDoorState: URL: " + requestUrl)      
      self.targetdoorstate = "closed";

      request({
        "url": requestUrl,
        "method": "PUT",
        "headers": {
          'User-Agent': self.myQ.UserAgent,
          'Content-Type': 'application/json',          
          'MyQApplicationId': self.myQ.MyQApplicationId,
          'SecurityToken': self.myQ.SecurityToken,
          "body": {'action_type':'close'}
          },
          "json": true
        }, function(error, response, body) {
            self.log("getCurrentDoorState error: " + error);
            self.log("getCurrentDoorState response: " + response);
            self.log("getCurrentDoorState body: " + body);
          if(error) {
            self.log("getCurrentDoorState error: " + error);
            self.log("getCurrentDoorState response: " + response);
            self.log("getCurrentDoorState body: " + body);
          } else {
            callback(null)
          }
        }
      );    

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
