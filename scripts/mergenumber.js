const { MongoClient } = require('mongodb');

async function main() {
    // Connection URL
    const url = 'mongodb://root:P4ss_W0rd@10.40.0.17:27017/?authSource=admin&readPreference=primary&ssl=false&directConnection=true';
    const client = new MongoClient(url);

    // Database Name
    const dbName = 'evolution-whatsapp-api';

    await client.connect();
    const db = client.db(dbName);
    const db2 = client.db(dbName);
        
    const contactCollection = db.collection('contacts')
    const messageCollection = db2.collection('messages')

    const args = process.argv.slice(2);

    const remoteJid = args[0]
    const remoteJidAlt = args[1]
    const owner = args[2]

    try {
        // Se o alt tem o @lid, deve pegar todas as mensagens que caíram no @lid e transferir para o @lid
        const mainContact = (await contactCollection.find({id: {$in: [remoteJid+'@lid', remoteJid+'@s.whatsapp.net']}, owner:owner }).toArray()).pop()
        const changeContact = (await contactCollection.find( {id: {$in: [remoteJidAlt+'@lid', remoteJidAlt+'@s.whatsapp.net']}, owner:owner }).toArray()).pop()
        
        console.log('Found main contact is: ', mainContact.id)
        console.log('Found change contact is: ', changeContact.id)
        if (mainContact && changeContact){
            await messageCollection.updateMany(
            { "key.remoteJid": changeContact.id, owner: owner },
            {$set: { "key.remoteJid": mainContact.id }}
            )
            await contactCollection.deleteOne({id: changeContact.id, owner:owner })
            console.log('done')
        }

    } catch (err) {
        console.error(err);

    } finally {
        // Close the connection
        await client.close();
    }
}

main().catch(console.error);
