const { MongoClient } = require('mongodb');

async function main() {
    // Connection URL
    const url = 'mongodb://root:root@localhost:27017/?authSource=admin&readPreference=primary&ssl=false&directConnection=true';
    const client = new MongoClient(url);

    // Database Name
    const dbName = 'evolution-whatsapp-api';

    try {
        // Connect to the MongoDB server
        await client.connect();
        console.log('Connected successfully to server');

        const db = client.db(dbName);

        // Collection Name
        const collection = db.collection('contacts');

        const default_message = {"key":{"remoteJid":"5527988583245@s.whatsapp.net","fromMe":false,"id":"3EB09D9B0935DD6A3F0578","participant":null},"pushName":"Lukas","message":{"conversation":"eae","messageContextInfo":{"deviceListMetadata":{"senderKeyIndexes":[],"recipientKeyIndexes":[],"senderKeyHash":"Iu8S5THVWKcBqQ==","senderTimestamp":{"low":1730229584,"high":0,"unsigned":true},"senderAccountType":0,"receiverAccountType":0,"recipientKeyHash":"syQLOw/8SHnhkg==","recipientTimestamp":{"low":1730211026,"high":0,"unsigned":true}},"deviceListMetadataVersion":2,"messageSecret":"4WIpr/2xiLh78YgvURNZtneybjYSYWLebi5e5tCTOVI=","paddingBytes":"","messageAddOnDurationInSecs":0,"botMessageSecret":"","botMetadata":null,"reportingTokenVersion":0}},"contextInfo":null,"messageType":"conversation","messageTimestamp":1731415242,"owner":"isacr00003_5527981375921","source":"web","sender":"Lukas"}

        const documents = []
        // Documents to be inserted
        for (let index = 0; index < 1000000; index++) {
          documents.push(
            { pushName: `test${index}`, id: `${index}@s.whatsapp.net`, profilePictureUrl: null ,
              owner:"isacr00003_5527981375922", __v: 0, lastMessage: {...default_message, messageTimestamp: default_message.messageTimestamp+index}}
          )
          
        }

      

        // Insert multiple documents
        const result = await collection.insertMany(documents);
        console.log(`${result.insertedCount} documents were inserted`);

    } catch (err) {
        console.error(err);
    } finally {
        // Close the connection
        await client.close();
    }
}

main().catch(console.error);
