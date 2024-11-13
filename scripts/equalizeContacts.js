
const { MongoClient } = require('mongodb');

const search = async (contact, messages) => {
    const message = await messages.find({ 'key.remoteJid': contact.id }).sort({ messageTimestamp: -1 }).toArray();
    if (message.length > 0) {
        contact.lastMessage = message[0]
    }
}

async function main() {
    // Connection URL
    const url = 'mongodb://root:root@127.0.0.1:27017/?authSource=admin&readPreference=primary&ssl=false&directConnection=true';
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
        const messages = db.collection('messages');

        const contacts = Object.values(await collection.find().toArray())
        await Promise.all(contacts.map(async contact => {
            const message = await messages.find({ 'key.remoteJid': contact.id }).sort({ messageTimestamp: -1 }).limit(1).toArray();
            if (message.length > 0) {
                const selected_message = message[0]
                await collection.updateOne({id: contact.id}, {$set: {lastMessage: {...selected_message, fromMe: selected_message.key.fromMe, sender:selected_message.pushName}}})
            }
        }))

    } catch (err) {
        console.error(err);
    } finally {
        // Close the connection
        await client.close();
    }
}

main().catch(console.error);
