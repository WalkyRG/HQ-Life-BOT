const prompt = require('prompt-sync')(),
      ws     = require('websocket').client,
      fs     = require('fs');

module.exports = {
    referralCode: null,
    verificationId: null,
    config: null,
    log: null,

    intervalShow: null,

    checkPhoneNumber: function(phoneNumber) {
        if (phoneNumber.charAt(0) != '+')
        {
            console.log(module.exports.log.error, 'Incorrect phone number (' + phoneNumber + '). Error code: 101');
            process.exit(1);
        }
        else if (phoneNumber.length < 8)
        {
            console.log(module.exports.log.error, 'Incorrect phone number (' + phoneNumber + '). Error code: 102');
            process.exit(1);
        }
    },

    verifyPhoneNumber: function(phoneNumber) {
        var code = prompt('Verification code (sent by sms to ' + phoneNumber + ') : ');

        var content = module.exports.config.requestInfo.verificationsCode.body.replace('(code)', code),
            url     = module.exports.config.requestInfo.verificationsCode.url.replace('(verificationId)', module.exports.verificationId),
            headers = module.exports.config.requestInfo.customHeaders;

        headers['Content-Length'] = content.length;

        request.post({
            url: url,
            headers: headers,
            body: content,
            gzip: true // don't know why ...
        }, function(err, res)
        {
            if (err) { console.log(module.exports.log.error, err); process.exit(1); }
            if (typeof res === 'undefined') { console.log(module.exports.log.error, 'Unable to fetch server response. Error code: 106'); process.exit(1); }
            if (!res.body) { console.log(module.exports.log.error, 'Server response is empty. Error code: 107'); process.exit(1); }

            try {
                var jsonBody = JSON.parse(res.body);
            } catch(e) {
                console.log(module.exports.log.error, 'Response does not match the valid format. Error code: 200');
                process.exit(1);
            }

            if (typeof jsonBody.error !== 'undefined') { console.log(module.exports.log.error, jsonBody.error); module.exports.verifyPhoneNumber(phoneNumber); } // got error
            else if (jsonBody.auth == null) { console.log(module.exports.log.success, 'Code is correct. Let the system register a new account...'); module.exports.verifyUsername(); }
            else { console.log(module.exports.log.error, 'An account already exists under this phone number'); }
        });
    },

    verifyUsername: function() {
        var username = module.exports.generateRandomUsername(),
            content  = module.exports.config.requestInfo.verifyUsername.body.replace('(username)', username),
            headers  = module.exports.config.requestInfo.customHeaders;

        headers['Content-Length'] = content.length;

        request.post({
            url: module.exports.config.requestInfo.verifyUsername.url,
            headers: headers,
            body: content
        }, function(err, res)
        {
            if (err) { console.log(module.exports.log.error, err); process.exit(1); }
            if (typeof res === 'undefined') { console.log(module.exports.log.error, 'Unable to fetch server response. Error code: 108'); process.exit(1); }
            if (!res.body) { console.log(module.exports.log.error, 'Server response is empty. Error code: 109'); process.exit(1); }

            try {
                var jsonBody = JSON.parse(res.body);
            } catch(e) {
                console.log(module.exports.log.error, 'Response does not match the valid format. Error code: 201');
                process.exit(1);
            }

            if (jsonBody.error) { module.exports.verifyUsername(); }
            else { console.log(module.exports.log.success, 'Successfully found a valid username'); module.exports.registerUser(username); }
        });
    },

    registerUser: function(username) {
        var content = module.exports.config.requestInfo.registerUser.body.replace('(username)', username).replace('(verificationId)', module.exports.verificationId).replace('(referralCode)', module.exports.referralCode),
            headers = module.exports.config.requestInfo.customHeaders;

        headers['Content-Length'] = content.length;

        request.post({
            url: module.exports.config.requestInfo.registerUser.url,
            headers: headers,
            body: content,
            gzip: true
        }, function(err, res)
        {
            if (err) { console.log(module.exports.log.error, err); process.exit(1); }
            if (typeof res === 'undefined') { console.log(module.exports.log.error, 'Unable to fetch server response. Error code: 110'); process.exit(1); }
            if (!res.body) { console.log(module.exports.log.error, 'Server response is empty. Error code: 111'); process.exit(1); }

            try {
                var jsonBody = JSON.parse(res.body);
            } catch(e) {
                console.log(module.exports.log.error, 'Response does not match the valid format. Error code: 202');
                process.exit(1);
            }

            if (jsonBody.error) { console.log(module.exports.log.error, jsonBody.error); process.exit(1); }
            else
            {
                fs.writeFile('accounts.list', jsonBody.accessToken + '\r\n', 'utf8');
                console.log(module.exports.log.success, 'Account successfully created ! Waiting start of next show to get life.');
            }
        });
    },

    generateRandomUsername: function() {
        var usernameLength = Math.floor((Math.random() * 12) + 6); // between 6 and 12 characters

        var username   = '',
            characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (var i = 0; i < usernameLength; i++)
        {
            username += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        return username;
    },

    checkShowStarted: function() {
        var showsHeaders = module.exports.config.requestInfo.customHeaders;
            showsHeaders['Authorization'] = 'Bearer ' + module.exports.config.testAccount.BEARER_TOKEN;

        request.get({
            url: module.exports.config.requestInfo.shows.url,
            headers: showsHeaders,
            gzip: true
        }, function(err, res)
        {
            if (err) { console.log(module.exports.log.error, err); }

            var jsonBody = JSON.parse(res.body);
            if (jsonBody['broadcast'])
            {
                clearInterval(module.exports.intervalShow);

                var socketUrl = jsonBody['broadcast']['socketUrl'].replace('https', 'wss');
                module.exports.connectAccounts(socketUrl);
            }
            else
            {
                console.log(module.exports.log.info, 'No running show. Next show: ' + new Date(Date.parse(jsonBody.nextShowTime)).toUTCString());
            }
        });
    },

    connectAccounts: function(socketUrl) {
        var client = new ws(),
            accounts = fs.readFileSync('accounts.list', 'utf8'),
            tokens   = accounts.split(/\r\n/);

        var connection = async () => {
            await asyncForeach(tokens, async (token) => {
                client.on('connect', function(connection)
                {
                    var pingInterval = setInterval(function() { connection.ping(); }, 5000);
                    connection.on('error', function(error)
                    {
                        console.log(module.exports.log.error, 'Connection Error: ' + error.toString());
                    });

                    connection.on('close', function(ev)
                    {
                        clearInterval(pingInterval);
                        console.log(module.exports.log.error, 'Connection Closed ' + ev.code);
                    });
                });

                client.connect(
                    socketUrl,
                    [],
                    '',
                    {
                        'User-Agent': 'okhttp/3.8.0',
                        'Authorization': 'Bearer ' + token,
                        'x-hq-client': 'iOS/1.2.17',
                        'x-hq-stk': 'MQ==',
                        'Connection': 'keep-alive',
                        'Accept-Encoding': 'gzip',
                        'Host': 'api-quiz.hype.space'
                    }
                );
            });
        };
        connection();
    }
};

async function asyncForeach(array, callback)
{
    for (var i = 0; i < array.length; i++)
    {
        await callback(array[i], i, array);
    }
}
