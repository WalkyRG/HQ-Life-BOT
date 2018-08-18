# HQ-Life-BOT
Get around the boring process of login/logout and save your time.

## Install
```
$ git clone https://github.com/WalkyRG/HQ-Life-BOT
$ cd HQ-Life-BOT
$ npm install
```
After you've properly installed the BOT, open the `config.json` file and fill in the `BEARER_TOKEN` field. This token will be used only for checking if there is an HQ Trivia game currently running. You can put the token of your own HQ account, or a test account. I recommend you to always use a test account that you don't use, even if I think there is no risk of getting banned using your own.

You can get your token by using [Charles Proxy](https://www.charlesproxy.com/) or [Fiddler](https://www.telerik.com/fiddler)

## Usage
```
$ node app
```
This will run the process of creating a new account in HQ ! Do not forget that you need a **valid phone number** as you need to get the verification code sent. For the moment, I limited the creation to 3 accounts (3 lifes), you can however change this in the code by your own. I'm not responsible if you're experiencing bugs/lags by increasing this limit.

```
$ node app -l
```
This command should be run before a live show starts, it will retrieve all the accounts you've created and connect them to the HQ Game. You'll then get the lifes !

## Error codes
* 100 - Invalid number of lifes (between 1 and 3)
* 101 - Phone number does not start with a country code (+)
* 102 - Phone number too short
* 103 - Unable to fetch server response (verifications)
* 104 - Empty server response (verifications)
* 105 - Unable to fetch a valid response from the server
* 106 - Unable to fetch server response when verifying phone number
* 107 - Empty server response when verifying phone number
* 108 - Unable to fetch server response when checking username availability
* 109 - Empty server response when checking username availability
* 110 - Unable to fetch server response when registering new account
* 111 - Empty server response when registering new account
* 200 - Invalid JSON format when verifying phone number (code)
* 201 - Invalid JSON format when verifying username availability
* 202 - Invalid JSON format when registering new user
* 210 - Unknown argument

## Contributing
All contributions are well welcomed.

## License
MIT License.
