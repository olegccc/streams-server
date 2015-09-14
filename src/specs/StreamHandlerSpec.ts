///<reference path='../interfaces/IRecord.ts'/>

import { StreamHandler } from '../modules/StreamHandler';
import { Constants } from '../interfaces/Constants';

class TestDataChannel implements IDataChannel {

    private records: IRecord[];

    constructor(records: IRecord[]) {
        this.records = records;
    }

    getRecord(id:string): IRecord {
        for (var i = 0; i < this.records.length; i++) {
            if (this.records[i].id === id) {
                return this.records[i];
            }
        }
        return null;
    }

    getIds(): string[] {
        var ids = [];
        this.records.forEach((record: IRecord) => {
            ids.push(record.id);
        });
        return ids;
    }
}

describe('Stream Handler', () => {
    it('should handle request to get all record ids', () => {
        var record: IRecord = {
            id: 'xx'
        };
        var testChannel = new TestDataChannel([record]);
        var handler = new StreamHandler(testChannel);
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_IDS;
        var response = handler.processRequest(request);
        expect(response.ids).toBeDefined();
        expect(response.ids.length).toBe(1);
        expect(response.ids[0]).toBe(record.id);
    });

    it('should get record by its id', () => {
        var record = { id: 'abc ', field1: 'aaa'};
        var testChannel = new TestDataChannel([record]);
        var handler = new StreamHandler(testChannel);
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_READ;
        request.id = record.id;
        var response = handler.processRequest(request);
        expect(response.record).toBeDefined();
        expect(response.record.id).toBe(record.id);
        expect((<any>(response.record)).field1).toBe(record.field1);
    });
});
