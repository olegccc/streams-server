///<reference path='../interfaces/IRecord.ts'/>
///<reference path='../interfaces/IDataChannel.ts'/>
///<reference path='../interfaces/IDataChannelUpdates.ts'/>

import _ = require('lodash');
import { Constants } from '../interfaces/Constants';

export class MemoryDataChannel implements IDataChannel {

    private records: IRecord[];
    private recordMap: { [key: string] : IRecord };
    private updates: IUpdate[];

    constructor(records?: IRecord[]) {
        this.records = records || [];
        this.updates = [];
        this.recordMap = {};
        _.each(this.records, (record: IRecord) => {
            this.recordMap[record.id] = record;
        });
    }

    read(id: string, callback: (error: Error, record?: IRecord) => void): void {
        callback(null, this.recordMap[id]);
    }

    update(record: IRecord, callback: (error: Error, record?: IRecord) => void): void {
        var toMerge = _.find(this.records, { id: record.id });

        if (!toMerge) {
            callback(new Error('Cannot find record'), null);
            return;
        }

        _.merge(toMerge, record);
        this.onChange(Constants.UPDATE_CHANGED, record.id);

        callback(null, toMerge);
    }

    create(record: IRecord, callback: (error: Error, record: IRecord) => void): void {
        if (!record.hasOwnProperty('id')) {
            for (;;) {
                var id = (Date.now() + Math.random()*1000).toString();
                if (!this.recordMap.hasOwnProperty(id)) {
                    record.id = id;
                    break;
                }
            }
        }
        if (this.recordMap.hasOwnProperty(record.id)) {
            callback(new Error("Record already exists"), null);
            return;
        }
        this.records.push(record);
        this.recordMap[record.id] = record;
        this.onChange(Constants.UPDATE_CREATED, record.id);
        callback(null, record);
    }

    private static filterField(field: any, test: any) {
        if (_.isString(test)) {
            if (!_.isString(field)) {
                return false;
            }
            var expression = new RegExp(test);
            if (!expression.test(field)) {
                return false;
            }
        } else if (_.isNumber(test)) {
            if (!_.isNumber(field)) {
                return false;
            }
            if (test !== field) {
                return false;
            }
        } else {
            return false;
        }
        return true;
    }

    private static filterRecord(record: IRecord, filter?: any): boolean {
        if (!filter) {
            return true;
        }
        if (_.isObject(filter)) {
            for (var key in filter) {
                if (!filter.hasOwnProperty(key)) {
                    continue;
                }
                var test = filter[key];
                var field = record[key];
                if (!MemoryDataChannel.filterField(field, test)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    getIds(filter: any, callback: (error: Error, ids?: string[]) => void): void {
        var ids = [];
        this.records.forEach((record: IRecord) => {
            if (MemoryDataChannel.filterRecord(record, filter)) {
                ids.push(record.id);
            }
        });
        callback(null, ids);
    }

    getAllRecords(): IRecord[] {
        return this.records;
    }

    remove(id: string, callback: (error: Error) => void): void {
        var index = _.findIndex(this.records, { id: id });
        if (index < 0) {
            callback(new Error("Cannot find record"));
            return;
        }
        var record = this.recordMap[id];
        this.records.splice(index, 1);
        delete this.recordMap[id];
        this.onChange(Constants.UPDATE_DELETED, id);
        callback(null);
    }

    getVersion(callback: (error: Error, version?: string) => void): void {
        callback(null, this.updates.length.toString());
    }

    getUpdates(from: string, filter: any, callback: (error: Error, updates?: IUpdate[]) => void): void {
        var updates = from ? _.drop(this.updates, parseInt(from)) : this.updates;
        updates = _.filter(updates, (update: IUpdate) => MemoryDataChannel.filterRecord(this.recordMap[update.id], filter));
        callback(null, updates);
    }

    private onChange(type:number, id:string):void {
        var update: IUpdate = {
            type: type,
            id: id,
            version: this.updates.length.toString()
        };

        this.updates.push(update);
    }
}
