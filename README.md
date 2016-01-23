# homebridge-myq
Homebridge Plug for Chamberlain MyQ Garage Door

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


