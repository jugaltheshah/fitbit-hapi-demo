'use strict';

const Wreck = require('@hapi/wreck');


const internals = {
    tokensColl: null
};

// Fitbit Web API OAuth 2.0 access tokens expire frequently and must be refreshed
function getAccessTokenByUserId(userId, cb) {
    db.findOne({_id: userId}, function(err, doc) {
        if (err) {
            throw new Error(err);
        }

        // Check to see if the token has expired
        const decodedToken = JWT.decode(doc.token, null, true);

        if (Date.now()/1000 > decodedToken.exp) {
            // Token expired, so refresh it.
            Wreck.post('https://api.fitbit.com/oauth2/token',
                {
                    headers: {
                        Authorization: 'Basic ' + new Buffer(process.env.FITBIT_OAUTH2_CLIENT_ID + ':' + process.env.FITBIT_OAUTH2_CLIENT_SECRET).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    json: true,
                    payload: 'grant_type=refresh_token&refresh_token=' + doc.refreshToken
                },
                function(err, response, payload) {
                    if (err) {
                        throw new Error(err);
                    }

                    // Save the new token
                    doc.token = payload.access_token;
                    doc.refreshToken = payload.refresh_token;

                    db.update(
                        {_id: doc._id}, // query
                        doc, // update
                        {}, // options
                        function(err, numReplaced, newDoc) {
                            if (err) {
                                throw new Error(err);
                            }

                            return cb(null, doc);
                        }
                    );
                }
            );
        } else {
            return cb(null, doc);
        }
    });
};

function processWebhookNotification(notifications) {
    // Multiple notifications may be received in a request
    // TODO: Handle more than one notification
    
    // Lookup the auth credentials of the user
    getAccessTokenByUserId(
        notifications[0].ownerId,
        function(err, authCredentials) {
            console.log('Doing something with the credentials...', authCredentials);
            
            Wreck.get('https://api.fitbit.com/1/user/-/profile.json',
                {
                    headers: {
                        Authorization: 'Bearer ' + authCredentials.token
                    },
                    json: true
                },
                function(err, response, payload) {
                    if (err) {
                        throw new Error(err);
                    }

                    console.log('Profile fetched: ', payload);
                }
            );
        }
    );
}

module.exports = [
    {
        method: 'GET',
        path:'/',
        handler: function (request, h) {
            return h.response('Go <a href="./signin">here</a> to sign in.');
        }
    },
    {
        method: ['GET', 'POST'],    // Must handle both GET and POST
        path: '/login',             // The callback endpoint registered with the provider
        options: {
            auth: {
              mode: 'try',
              strategy: 'fitbit'
            },
            handler: function (request, h) {

                if (!request.auth.isAuthenticated) {
                    return `Authentication failed due to: ${request.auth.error.message}`;
                }

                // Perform any account lookup or registration, setup local session,
                // and redirect to the application. The third-party credentials are
                // stored in request.auth.credentials. Any query parameters from
                // the initial request are passed back via request.auth.credentials.query.

                return h.redirect('/home');
            }
        }
    },    
    {
        method: 'GET',
        path:'/signin',
        config: {
            auth: {
                mode: 'try',
                strategy: 'fitbit'
            },
            handler: function (request, h) {

                const db = request.server.app.db;
                let tokensColl = internals.tokensColl
                
                if (!tokensColl) {
                    tokensColl = db.addCollection('tokens');
                    internals.tokensColl = tokensColl;
                }
                
                if (!request.auth.isAuthenticated) {
                    return h.response('Authentication failed due to: ' + request.auth.error.message);
                }
                
                // Set the key for this database record to the user's id
                const profileId = request.auth.credentials.profile.id;
                request.auth.credentials._id = profileId;
                
                // Save the credentials to database
                tokensColl.insert({
                    _id: profileId,
                    token: request.auth.credentials.token,
                    refreshToken: request.auth.credentials.refreshToken,
                    expiresIn: request.auth.credentials.expiresIn,
                    profile: request.auth.credentials.profile
                })

                // return h.response('Signed in as ' + request.auth.credentials.profile.displayName);
                return h.response(tokensColl);
            }
        }
    },
    {
        method: 'GET',
        path:'/auth-callback',
        handler: function(request, h) {
            return h.response('Signed in as ' + request.auth.credentials.profile.displayName);
        }
    },
    {
        method: 'POST',
        path:'/webhook-receiver',
        config: {
            payload: {
                output: 'data',
                parse: false
            }
        },
        handler: function (request, h) {
            h.response().code(204);
            
            // Verify request is actually from Fitbit
            // https://dev.fitbit.com/docs/subscriptions/#security
            const requestHash = crypto.createHmac('sha1', process.env.FITBIT_OAUTH2_CLIENT_SECRET+'&').update(request.payload.toString()).digest('base64');
            
            if (requestHash !== request.headers['x-fitbit-signature']) {
                return console.error('Invalid subscription notification received.');
            }
            
            // Process this request after the response is sent
            setImmediate(processWebhookNotification, JSON.parse(request.payload.toString()));
        }
    }    
];

