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
        const collection = db.collection('messages');

        const default_message = {
            "conversation": "asdsa",
            "messageContextInfo": "{\"deviceListMetadata\":\"{\\\"senderKeyIndexes\\\":\\\"[]\\\",\\\"recipientKeyIndexes\\\":\\\"[]\\\",\\\"senderKeyHash\\\":\\\"BinData(0, \\\\\\\"\\\\\\\"�\\\\u0012�1�X�\\\\u0001�\\\\\\\")\\\",\\\"senderTimestamp\\\":\\\"{\\\\\\\"low\\\\\\\":1735416201,\\\\\\\"high\\\\\\\":0,\\\\\\\"unsigned\\\\\\\":\\\\\\\"true\\\\\\\"}\\\",\\\"senderAccountType\\\":0,\\\"receiverAccountType\\\":0,\\\"recipientKeyHash\\\":\\\"BinData(0, \\\\\\\"[��`{-|=��\\\\\\\")\\\",\\\"recipientTimestamp\\\":\\\"{\\\\\\\"low\\\\\\\":1734631337,\\\\\\\"high\\\\\\\":0,\\\\\\\"unsigned\\\\\\\":\\\\\\\"true\\\\\\\"}\\\"}\",\"deviceListMetadataVersion\":2,\"messageSecret\":\"BinData(0, \\\"K�\\u0005,\\fZu-V�c9��+�@MM��\\t���$ \\u001c\\u0012@f|\\\")\",\"paddingBytes\":\"BinData(0, \\\"\\\")\",\"messageAddOnDurationInSecs\":0,\"botMessageSecret\":\"BinData(0, \\\"\\\")\",\"botMetadata\":null,\"reportingTokenVersion\":0}"
        }

        const documents = []
        // Documents to be inserted
        for (let index = 0; index < 1000000; index++) {
          documents.push({
            key: {
                "id": `aaa-${index}`,
                "remoteJid": "5527988291539@s.whatsapp.net",
                "fromMe": "false"
            },
            pushName: 'Lucas Scandian',
            messageType: 'conversation',
            message: default_message,
            source: 'web',
            messageTimestamp: 1736542826 + index,
            owner: 'isacr00003_5527981375921',
            __v: 0
          }
            
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
