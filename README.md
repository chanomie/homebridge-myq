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
         "UserAgent": "Chamberlain/2793 (iPhone; iOS 9.3; Scale/2.00)",
         "BrandId": "2",
         "culture": "en",
         "username": "myusername@example.com",
         "password": "supersecretpassword",
         "loglevel":"0"
       }
    ],
```


# MyQ API

## validatewithculture

The initial request is used to validate the connection with MyQ servers.

### Required Headers

* 'Content-Type': 'application/json',
* 'User-Agent': 'Chamberlain/2793 (iPhone; iOS 9.3; Scale/2.00)',
* 'BrandId' - my BrandId is "2" for the garage I have.
* 'Culture' - my culture is 'en' - maybe others are supported?
* 'MyQApplicationId': "NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx"
   I think this is a hardcoded value representing the iOS app.
* 'SecurityToken' - self.SecurityToken

### URL Paramaters

* 'appId': self.MyQApplicationId,
* 'SecurityToken': self.SecurityToken,
* 'username': self.username,
* 'password': self.password,
* 'culture': self.culture


