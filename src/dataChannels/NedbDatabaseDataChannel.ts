///<reference path='../interfaces/IDataChannel.ts'/>

import Datastore = require('nedb');
import _ = require('lodash');
import { Constants } from '../interfaces/Constants';

export class NedbDatabaseDataChannel implements IDataChannel {

    private db = new Datastore();
    private versionDb = new Datastore();
    private versionId: number = 0;

    constructor() {
    }

    private getVersionId(): number {
        return (Date.now()*1000) + ((this.versionId++) % 1000);
    }

    private getQuery(filter: any): any {
        var query: any = {};
        if (!_.isObject(filter)) {
            return query;
        }
        _.forOwn(filter, (test, field) => {
            if (_.isString(test)) {
                query[field] = new RegExp(test);
            } else if (_.isNumber(test)) {
                query[field] = test;
            }
        });
        return query;
    }

    getIds(filter: any, options: IQueryOptions, callback: (error: Error, ids?: string[]) => void) {

        var fieldsToGet: any = {
            _id: 1
        };

        if (options && options.getVersion) {
            fieldsToGet.version = 1;
        }

        var find = this.db.find(this.getQuery(filter), fieldsToGet);

        if (options) {
            if (options.order) {
                find = find.sort(options.order);
            }
            if (options.from) {
                find = find.skip(options.from);
            }
            if (options.count) {
                find = find.limit(options.count);
            }
        }

        find.exec((err, docs) => {
            if (err) {
                callback(err);
                return;
            }
            var ids = [];
            _.each(docs, (doc: any) => {
                ids.push(options && options.getVersion ? doc._id + ':' + doc.version : doc._id);
            });
            callback(err, ids);
        });
    }

    read(id: string, callback: (error: Error, record?: IRecord) => void) {
        this.db.findOne({
            _id: id
        }, (error: Error, doc: any) => {
            if (error) {
                callback(error);
                return;
            }
            var record = _.cloneDeep(doc);
            record.id = id;
            delete record._id;
            callback(error, record);
        });
    }

    readMany(ids: string[], callback: (error: Error, records?: IRecord[]) => void) {

        var searchCriteria = <any> {};
        if (ids) {
            searchCriteria._id = {
                $in: ids
            };
        }

        this.db.find(searchCriteria, (error: Error, docs: any[]) => {
            if (error) {
                callback(error);
                return;
            }
            var records: IRecord[] = [];
            _.each(docs, (doc: any) => {
                var record = _.cloneDeep(doc);
                record.id = record._id;
                delete record._id;
                records.push(record);
            });
            callback(error, records);
        });
    }

    update(record: IRecord, callback: (error: Error, record?: IRecord) => void) {
        var newRecord:any = _.cloneDeep(record);
        var id = newRecord.id;
        delete newRecord.id;
        newRecord._id = id;
        newRecord.version = this.getVersionId();
        this.db.update({ _id: id}, newRecord, (err: Error, updated: number) => {
            if (err) {
                callback(err);
                return;
            }
            if (updated === 0) {
                callback(new Error("No documents to update"));
                return;
            }
            newRecord.id = id;
            delete newRecord._id;
            this.versionDb.insert({
                created: this.getVersionId(),
                id: id,
                type: Constants.UPDATE_CHANGED
            }, (err: Error) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback(err, newRecord);
            });
        });
    }

    create(record: IRecord, callback: (error: Error, record?: IRecord) => void) {
        var newRecord:any = _.cloneDeep(record);
        if (newRecord.hasOwnProperty("id")) {
            newRecord._id = newRecord.id;
            delete newRecord.id;
        }
        newRecord.version = this.getVersionId();
        this.db.insert(newRecord, (err: Error, doc: any) => {
            if (err) {
                callback(err);
                return;
            }
            newRecord = _.cloneDeep(doc);
            newRecord.id = newRecord._id;
            delete newRecord._id;
            this.versionDb.insert({
                created: this.getVersionId(),
                id: newRecord.id,
                type: Constants.UPDATE_CREATED
            }, (err: Error) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback(err, newRecord);
            });
        });
    }

    createMany(records: IRecord[], callback: (error: Error, records?: IRecord[]) => void) {
        records = _.cloneDeep(records);
        _.each(records, (record: any) => {
            if (record.hasOwnProperty("id")) {
                record._id = record.id;
                delete record.id;
            }
            record.version = this.getVersionId();
        });
        this.db.insert(records, (error: Error, records: IRecord[]) => {
            if (error) {
                callback(error);
                return;
            }
            var histories: any[] = [];
            _.each(records, (record: any) => {
                histories.push({
                    created: this.getVersionId(),
                    id: record.id,
                    type: Constants.UPDATE_CREATED
                });
                record.id = record._id;
                delete record._id;
            });
            this.versionDb.insert(histories, (error: Error) => {
                if (error) {
                    callback(error);
                    return;
                }
                callback(error, records);
            });
        });
    }

    remove(id: string, callback: (error: Error) => void) {
        this.db.remove({
            _id: id
        }, {}, (error: Error, count: number) => {
            if (error) {
                callback(error);
                return;
            }
            if (!count) {
                callback(new Error("No record found"));
                return;
            }
            this.versionDb.insert({
                created: this.getVersionId(),
                id: id,
                type: Constants.UPDATE_DELETED
            }, callback);
        })
    }

    getVersion(callback: (error: Error, version?: string) => void) {
        this.versionDb
            .find({})
            .sort({created: -1})
            .limit(1)
            .exec((error, docs?: any[]) => {
                if (error) {
                    callback(error);
                    return;
                }
                callback(error, docs.length ? docs[0].created.toString() : null);
        });
    }

    getUpdates(from: string, filter: any, options: IQueryOptions, callback: (error: Error, updates?: IUpdate[]) => void) {
        var query: any = {};
        if (from) {
            query.created = {
                $gt: parseInt(from)
            }
        }
        this.versionDb.find(query).sort({
            created: 1
        }).exec((error, docs?: any[]) => {
            if (error) {
                callback(error);
                return;
            }

            function prepareUpdates(docs: any[]) {
                var updates: IUpdate[] = [];
                _.each(docs, (doc: any) => {
                    var update = {
                        type: doc.type,
                        id: doc.id,
                        version: doc.created.toString()
                    };
                    updates.push(update);
                });
                callback(error, updates);
            }

            if (!docs.length || (!filter && !options)) {
                prepareUpdates(docs);
            } else {
                this.getIds(filter, options, (error: Error, ids: string[]) => {
                    var idsMap = {};
                    _.each(ids, (id: string) => {
                        idsMap[id] = true;
                    });
                    docs = _.filter(docs, (doc) => {
                        return idsMap.hasOwnProperty(doc.id);
                    });
                    prepareUpdates(docs);
                });
            }
        });
    }
}
