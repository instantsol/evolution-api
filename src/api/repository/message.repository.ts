import { mkdirSync, opendirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { SortOrder } from 'mongoose';
import { join } from 'path';

import { ConfigService, StoreConf } from '../../config/env.config';
import { Logger } from '../../config/logger.config';
import { IInsert, Repository } from '../abstract/abstract.repository';
import { IMessageModel, MessageRaw, MessageRawSelect } from '../models';

export class MessageQuery {
  select?: MessageRawSelect;
  where: MessageRaw;
  limit?: number;
  sort?: { [key: string]: SortOrder };
  skip?: number;
}

function base64FileSize(base64String) {
  // Remove the data URI prefix if present
  const cleanedBase64 = base64String; //.split(',').pop();

  // Calculate the padding characters
  const padding = cleanedBase64.endsWith('==') ? 2 : cleanedBase64.endsWith('=') ? 1 : 0;

  // Compute the size in bytes
  const sizeInBytes = (cleanedBase64.length * 3) / 4 - padding;

  return sizeInBytes;
}

export class MessageRepository extends Repository {
  constructor(private readonly messageModel: IMessageModel, private readonly configService: ConfigService) {
    super(configService);
  }

  private readonly logger = new Logger('MessageRepository');

  private saveBase64ToFile(base64String: string, filePath: string): void {
    const buffer = Buffer.from(base64String, 'base64');
    writeFileSync(filePath, buffer);
  }

  public buildQuery(query: MessageQuery): MessageQuery {
    for (const [o, p] of Object.entries(query?.where || {})) {
      if (typeof p === 'object' && p !== null && !Array.isArray(p)) {
        if (o === 'messageTimestamp') {
          this.logger.verbose("Don't touch the messageTimestamp in where clause");
          continue;
        }
        for (const [k, v] of Object.entries(p)) {
          query.where[`${o}.${k}`] = v;
        }
        delete query.where[o];
      }
    }

    for (const [o, p] of Object.entries(query?.select || {})) {
      if (typeof p === 'object' && p !== null && !Array.isArray(p)) {
        for (const [k, v] of Object.entries(p)) {
          query.select[`${o}.${k}`] = v;
        }
        delete query.select[o];
      }
    }

    return query;
  }

  public async insert(data: MessageRaw[], instanceName: string, saveDb = false): Promise<IInsert> {
    this.logger.verbose('inserting messages');

    if (!Array.isArray(data) || data.length === 0) {
      this.logger.verbose('no messages to insert');
      return;
    }

    try {
      if (this.dbSettings.ENABLED && saveDb) {
        this.logger.verbose('saving messages to db');
        const cleanedData = data.map((obj) => {
          const cleanedObj = { ...obj };
          if ('extendedTextMessage' in obj.message) {
            const extendedTextMessage = obj.message.extendedTextMessage as {
              contextInfo?: {
                mentionedJid?: any;
              };
            };

            if (typeof extendedTextMessage === 'object' && extendedTextMessage !== null) {
              if ('contextInfo' in extendedTextMessage) {
                delete extendedTextMessage.contextInfo?.mentionedJid;
                extendedTextMessage.contextInfo = {};
              }
            }
          }
          return cleanedObj;
        });

        let insert = 0;
        for (const message of cleanedData) {
          if (
            (message.message as { base64?: string })?.base64 &&
            base64FileSize((message.message as { base64?: string }).base64) > 10 * 1024 * 1024 /* 10 MB */
          ) {
            const b64 = (message.message as { base64: string }).base64;
            const p = instanceName.split('_');
            const path = join('/mnt', 'export', p[0], 'scout', p[1], message.key.id);
            // Create directory path if not exists
            mkdirSync(join('/mnt', 'export', p[0], 'scout', p[1]), { recursive: true });

            this.saveBase64ToFile(b64, path);
            delete (message.message as { base64?: string }).base64;
            (message.message as { localPath?: string }).localPath = path;
            const i = await this.messageModel.insertMany([message]);
            insert = insert + i.length;
          } else {
            const i = await this.messageModel.insertMany([message]);
            insert = insert + i.length;
          }
        }

        this.logger.verbose('messages saved to db: ' + insert + ' messages');
        return { insertCount: insert };
      }

      this.logger.verbose('saving messages to store');

      const store = this.configService.get<StoreConf>('STORE');

      if (store.MESSAGES) {
        this.logger.verbose('saving messages to store');

        data.forEach((message) => {
          this.writeStore({
            path: join(this.storePath, 'messages', instanceName),
            fileName: message.key.id,
            data: message,
          });
          this.logger.verbose(
            'messages saved to store in path: ' + join(this.storePath, 'messages', instanceName) + '/' + message.key.id,
          );
        });

        this.logger.verbose('messages saved to store: ' + data.length + ' messages');
        return { insertCount: data.length };
      }

      this.logger.verbose('messages not saved to store');
      return { insertCount: 0 };
    } catch (error) {
      console.log('ERROR: ', error);
      return error;
    } finally {
      data = undefined;
    }
  }

  public async find(query: MessageQuery) {
    try {
      this.logger.verbose('finding messages');
      if (this.dbSettings.ENABLED) {
        this.logger.verbose('finding messages in db');
        query = this.buildQuery(query);

        return await this.messageModel.aggregate([
          { $match: { ...query.where } },
          { $sort: (query?.sort as Record<string, 1 | -1>) ?? { messageTimestamp: -1 } },
          { $skip: query?.skip ?? 0 },
          { $limit: (query?.limit ?? 0) + (query?.limit ?? 1) * 5 },
          {
            $group: {
              _id: '$key', // Replace with the unique field
              doc: { $first: '$$ROOT' },
            },
          },
          { $replaceRoot: { newRoot: '$doc' } },
          { $sort: (query?.sort as Record<string, 1 | -1>) ?? { messageTimestamp: -1 } },
          //{ $skip: query?.skip ?? 0 }, Fix messages not showing after some scrolls
          { $limit: query?.limit ?? 0 },
        ]);
      }

      this.logger.verbose('finding messages in store');
      const messages: MessageRaw[] = [];
      if (query?.where?.key?.id) {
        this.logger.verbose('finding messages in store by id');
        messages.push(
          JSON.parse(
            readFileSync(join(this.storePath, 'messages', query.where.owner, query.where.key.id + '.json'), {
              encoding: 'utf-8',
            }),
          ),
        );
      } else {
        this.logger.verbose('finding messages in store by owner');
        const openDir = opendirSync(join(this.storePath, 'messages', query.where.owner), {
          encoding: 'utf-8',
        });

        for await (const dirent of openDir) {
          if (dirent.isFile()) {
            messages.push(
              JSON.parse(
                readFileSync(join(this.storePath, 'messages', query.where.owner, dirent.name), {
                  encoding: 'utf-8',
                }),
              ),
            );
          }
        }
      }

      this.logger.verbose('messages found in store: ' + messages.length + ' messages');
      return messages
        .sort((x, y) => {
          return (y.messageTimestamp as number) - (x.messageTimestamp as number);
        })
        .splice(0, query?.limit ?? messages.length);
    } catch (error) {
      this.logger.error(`error on message find: ${error.toString()}`);
      return [];
    }
  }

  public async update(data: MessageRaw[], instanceName: string, saveDb?: boolean): Promise<IInsert> {
    try {
      if (this.dbSettings.ENABLED && saveDb) {
        this.logger.verbose('updating messages in db');

        const messages = data.map((message) => {
          return {
            updateOne: {
              filter: { 'key.id': message.key.id },
              update: { ...message },
            },
          };
        });

        const { nModified } = await this.messageModel.bulkWrite(messages);

        this.logger.verbose('messages updated in db: ' + nModified + ' messages');
        return { insertCount: nModified };
      }

      this.logger.verbose('updating messages in store');

      const store = this.configService.get<StoreConf>('STORE');

      if (store.MESSAGES) {
        this.logger.verbose('updating messages in store');
        data.forEach((message) => {
          this.writeStore({
            path: join(this.storePath, 'messages', instanceName),
            fileName: message.key.id,
            data: message,
          });
          this.logger.verbose(
            'messages updated in store in path: ' +
              join(this.storePath, 'messages', instanceName) +
              '/' +
              message.key.id,
          );
        });

        this.logger.verbose('messages updated in store: ' + data.length + ' messages');
        return { insertCount: data.length };
      }

      this.logger.verbose('messages not updated');
      return { insertCount: 0 };
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async delete(query: MessageQuery) {
    try {
      this.logger.verbose('deleting message');
      if (this.dbSettings.ENABLED) {
        this.logger.verbose('deleting message in db');
        query = this.buildQuery(query);

        return await this.messageModel.deleteOne({ ...query.where });
      }

      this.logger.verbose('deleting message in store');
      rmSync(join(this.storePath, 'messages', query.where.owner, query.where.key.id + '.json'), {
        force: true,
        recursive: true,
      });

      return { deleted: { messageId: query.where.key.id } };
    } catch (error) {
      return { error: error?.toString() };
    }
  }
}
