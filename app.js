const fs = require('fs')
      request = require('request'),
      prompt = require('prompt-sync')(),
      functions = require('./functions'),
      sleep = require('system-sleep');

var config = fs.readFileSync('config.json', 'utf8'),
    config = JSON.parse(config);

var log = {
    error: '\x1b[31m%s\x1b[0m',
    info: '\x1b[36m%s\x1b[0m',
    success: '\x1b[32m%s\x1b[0m'
};

functions.config = config;
functions.log = log;

// connect accounts (valid lifes)
if (typeof process.argv[2] !== 'undefined')
{
    if (process.argv[2] == '-l')
    {
        // use test account to check if show started
        functions.intervalShow = setInterval(functions.checkShowStarted, 3500);
    }
    else
    {
        console.log(log.error, 'Unknown argument. Error code: 210');
    }
}
else // create accounts for lifes
{
    var phoneNumbers = [];
    var number       = prompt('How many lifes ? (3 max.) : ');

    if (number > 3 || number <= 0 || isNaN(number))
    {
        console.log(log.error, 'Please choose a number between 1 and 3. Error code: 100');
        process.exit(1);
    }
    else
    {
        console.log(log.info, 'Please prepare ' + number + ' phone number(s).\r\n');
    }

    var referralCode = prompt('Referral code : ');
    functions.referralCode = referralCode;

    for (var i = 0; i < number; i++)
    {
        var phoneNumber = prompt('Phone number (including country code) : ');
        functions.checkPhoneNumber(phoneNumber);

        phoneNumbers.push(phoneNumber);
    }

    console.log(log.success, 'All ' + number + ' phone numbers are valid.\r\n');

    phoneNumbers.forEach(function(element)
    {
        var content = config.requestInfo.verifications.body.replace('(phoneNumber)', element),
            headers = config.requestInfo.customHeaders;

        headers['Content-Length'] = content.length;

        request.post({
            url: config.requestInfo.verifications.url,
            headers: headers,
            body: content
        }, function(err, res)
        {
            if (err) { console.log(log.error, err); process.exit(1); }
            if (typeof res === 'undefined') { console.log(log.error, 'Unable to fetch server response. Error code: 103'); process.exit(1); }
            if (typeof res.body === 'undefined') { console.log(log.error, 'Server response is empty. Error code: 104'); process.exit(1); }

            var jsonBody = JSON.parse(res.body),
                verificationId = jsonBody['verificationId'];

            if (typeof verificationId === 'undefined') { console.log(log.error, 'Unable to fetch a correct response. Error code: 105'); process.exit(1); }

            functions.verificationId = verificationId;

            console.log(log.success, 'Successfully got response. Waiting 3 seconds...');
            sleep(3000);

            functions.verifyPhoneNumber(element);
        });
    });
}

//console.log(log.success, '>> Process finished !');
