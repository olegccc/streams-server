///<reference path='../interfaces/IDataChannel.ts'/>

import { Constants } from '../interfaces/Constants';
import _ = require('lodash');

export class SynchronizedDictionary {

    private dataChannel: IDataChannel;
    private keyField: string;
    private cacheUpdateInterval: number;
    private lastVersion: string;
    private filter: any;
    private dictionary: { [key: string] : IRecord[] };
    private reverse: { [id: string] : IRecord[] };
    private lastUpdate: number;

    constructor(dataChannel: IDataChannel, keyField: string, filter?: any) {
        this.dataChannel = dataChannel;
        this.keyField = keyField;
        this.cacheUpdateInterval = Constants.DEFAULT_CACHE_UPDATE_INTERVAL;
        this.lastVersion = null;
        this.filter = filter;
        this.dictionary = {};
        this.reverse = {};
        this.lastUpdate = 0;
    }

    setCacheUpdateInterval(interval: number) {
        this.cacheUpdateInterval = interval;
    }

    private updateData(callback: (error: Error) => void): void {
        if (Date.now()-this.lastUpdate < this.cacheUpdateInterval) {
            callback(null);
            return;
        }

        if (this.lastVersion === null) {
            this.dataChannel.getIds(this.filter, null, (error: Error, ids: string[]) => {
                if (error) {
                    callback(error);
                    return;
                }
                this.dataChannel.getVersion((error: Error, version: string) => {
                    if (error) {
                        callback(error);
                        return;
                    }
                    this.dataChannel.readMany(ids, (error: Error, records: IRecord[]) => {
                        this.dictionary = {};
                        _.each(records, (record: IRecord) => {
                            var key = record[this.keyField];
                            if (!_.isUndefined(key)) {
                                if (!this.dictionary.hasOwnProperty(key)) {
                                    this.dictionary[key] = [];
                                }
                                this.dictionary[key].push(record);
                                this.reverse[record.id] = this.dictionary[key];
                            }
                        });
                        this.lastVersion = version;
                        this.lastUpdate = Date.now();
                        callback(null);
                    });
                });
            });
        } else {
            this.dataChannel.getUpdates(this.lastVersion, this.filter, null, (error: Error, updates: IUpdate[]) => {
                var idsToGet: string[] = [];
                _.each(updates, (update: IUpdate) => {
                    this.lastVersion = update.version;
                    switch (update.type) {
                        case Constants.UPDATE_CHANGED:
                        case Constants.UPDATE_CREATED:
                            idsToGet.push(update.id);
                            break;
                        case Constants.UPDATE_DELETED:
                            var list = this.reverse[update.id];
                            _.remove(list, (record: IRecord) => record.id === update.id);
                            break;
                    }
                });

                if (!idsToGet.length) {
                    this.lastUpdate = Date.now();
                    callback(null);
                    return;
                }

                this.dataChannel.readMany(idsToGet, (error:Error, records:IRecord[]) => {
                    if (error) {
                        callback(error);
                        return;
                    }
                    _.each(records, (record:IRecord) => {
                        var list = this.reverse[record.id];
                        if (list) {
                            var i = _.findIndex(list, (item: IRecord) => item.id === record.id);
                            if (i >= 0) {
                                list[i] = record;
                            }
                        } else {
                            var key = record[this.keyField];
                            if (!_.isUndefined(key)) {
                                if (this.dictionary.hasOwnProperty(key)) {
                                    list = this.dictionary[key];
                                } else {
                                    list = [];
                                    this.dictionary[key] = list;
                                }
                                list.push(record);
                                this.reverse[record.id] = list;
                            }
                        }
                    });
                    this.lastUpdate = Date.now();
                    callback(null);
                });
            });
        }
    }

    get(key: string, callback: (error: Error, records?: IRecord[]) => void) {
        this.updateData((error: Error) => {
            if (error) {
                callback(error);
                return;
            }
            callback(error, this.dictionary[key]);
        });
    }
}
