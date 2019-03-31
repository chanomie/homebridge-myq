# Project Retired

Already an existing project that does this called "Liftmaster":
https://github.com/nfarina/homebridge-liftmaster

# homebridge-myq
Homebridge Plug for Chamberlain MyQ Garage Door

# Installation
 * Install homebridge using: npm install -g homebridge
 * Install this plugin using: npm install -g homebridge-myq
 * Update your configuration file. See the sample below.

# Configuration

Add the token to your config and restart homebridge.  Make sure to update the username
and password the values you have set in the App.

```
    "platforms": [
       {
         "platform": "MyQ",
         "name": "MyQ",
         "MyQApplicationId": "NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx",
         "UserAgent": "Chamberlain/10482 CFNetwork/978.0.7 Darwin/18.6.0",
         "username": "myusername@example.com",
         "password": "supersecretpassword",
         "loglevel":"0"
       }

    ],
```


# MyQ API

## 1) Execute the Login API to get Security Token

### Required Headers
POST https://api.myqdevice.com/api/v5/Login
* 'Content-Type': 'application/json',
* 'User-Agent': 'Chamberlain/10482 CFNetwork/978.0.7 Darwin/18.6.0'
* 'MyQApplicationId': 'NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx'

### JSON Body
* UserName
* Password

```
myqToken=$(curl -s -X POST -H "Content-Type: application/json" -H "User-Agent: Chamberlain/10482 CFNetwork/978.0.7 Darwin/18.6.0" -H "MyQApplicationId: NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx" -d "{\"UserName\":\"$myqUsername\",\"Password\":\"$myqPassword\"}" "https://api.myqdevice.com/api/v5/Login" | jq -r .SecurityToken)
```

## 2) Get Account Id
GET https://api.myqdevice.com/api/v5/My?expand=account


```
myqAccountId=$(curl -s -G -H "User-Agent: Chamberlain/10482 CFNetwork/978.0.7 Darwin/18.6.0" -H "MyQApplicationId: NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx" -H "SecurityToken: ${myqToken}" "https://api.myqdevice.com/api/v5/My?expand=account" | jq -r .Account.Id)
```

## 3) Get Devices and State

```
curl -s -H "User-Agent: Chamberlain/10482 CFNetwork/978.0.7 Darwin/18.6.0" -H "MyQApplicationId: NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx" -H "SecurityToken: ${myqToken}" "https://api.myqdevice.com/api/v5.1/Accounts/${myqAccountId}/Devices" | jq .
```

## Open the Garage Door

### Required Headers
PUT https://api.myqdevice.com/api/v5.1/Accounts/${myqAccountId}/Devices/${myqDeviceId}/actions
* 'Content-Type': 'application/json',
* 'User-Agent': 'Chamberlain/10482 CFNetwork/978.0.7 Darwin/18.6.0'
* 'MyQApplicationId': 'NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx'

### JSON Body
* action_type: open



