This is a proof of concept example for using the Fitbit Web API. It demonstrates:
- Obtaining consent from a user to make requests to the Fitbit Web API using OAuth 2.0 Authorization Code Flow
- Subscribing to changes in the user's activity data
- Receiving notifications when the user's activity data is updated

This is not intended to be an example of a idiomatic hapi.js application. It is merely a demonstration of the above core concepts. In other words, don't use this code as the foundation for your next great Fitbit Web API app.

I'm serious. This is not a well structured Node.js application.

This example app uses NeDB, a flat-file database similar to Mongo. It's meant to be easy to demo, not highly scalable.

This example assumes you're using Node.js 4.2.x

# To get started

`npm install`

## Fitbit Web API client settings at https://dev.fitbit.com/app

Set your OAuth redirect URI to:
<your server here>/signin

Set your subscriber endpoint URI to:
<your server here>/webhook-receiver

# To run locally

`FITBIT_OAUTH2_CLIENT_ID=todo_your_fitbit_client_id \
FITBIT_OAUTH2_CLIENT_SECRET=todo_your_fitbit_client_secret \
COOKIE_PASSWORD=todo_put_anything_here \
PORT=8000 \
CLOUD_DIR='./' \
node index.js`

To receive notifications locally, you'll need to use a tool like [ngrok](https://ngrok.com/).
`~/Applications/ngrok http 8000`
    

# To run on Modulus:

Set the environment variables using the instructions at http://help.modulus.io/customer/portal/articles/1701180-using-environments-variables
FITBIT_OAUTH2_CLIENT_ID
FITBIT_OAUTH2_CLIENT_SECRET
COOKIE_PASSWORD

(PORT and CLOUD_DIR will be automatically added by Modulus)

How non-ephemeral file storage (used by NeDB) works on Modulus:
http://help.modulus.io/customer/en_us/portal/articles/1653448-file-storage
