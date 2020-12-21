// Load modules

const Bell = require('@hapi/bell');
const Hapi = require('@hapi/hapi');
const Routes = require('./routes');
const Path = require('path');

// Connect to databaseget
const Datastore = require('nedb');
const db = new Datastore({
    filename: Path.join(process.env.CLOUD_DIR, 'nedb.json'),
    autoload: true
});

const internals = {};

internals.start = async function () {

    const server = Hapi.server({ port: process.env.PORT || 3000 });

    // Register bell with the server

    await server.register(Bell);

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.

    server.auth.strategy('fitbit', 'bell', {
        provider: {
            protocol: 'oauth2',
            useParamsAuth: false,
            auth: 'https://www.fitbit.com/oauth2/authorize',
            token: 'https://api.fitbit.com/oauth2/token',
            scope: ['profile', 'activity', 'heartrate', 'location', 'settings'],
            profile: function(credentials, params, get, callback) {
                get('https://api.fitbit.com/1/user/-/profile.json', null, function(profile) {
                    credentials.profile = {
                        id: profile.user.encodedId,
                        displayName: profile.user.displayName,
                        name: profile.user.fullName
                    };
    
                    return callback();
                });
            }
        },
        password: process.env.COOKIE_PASSWORD,
        clientId: process.env.FITBIT_OAUTH2_CLIENT_ID,
        clientSecret: process.env.FITBIT_OAUTH2_CLIENT_SECRET,
        cookie: 'bell-fitbit',
        isSecure: false // Remove if server is HTTPS, which it should be if using beyond a demo.
    });    

    Routes.forEach(r => server.route(r));    

    await server.start();

    console.log(`Server started on port ${process.env.PORT} at uri ${server.info.uri}`)
};

internals.start();