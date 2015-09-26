///<reference path='../interfaces/IRecord.ts'/>

import { StreamHandler } from '../modules/StreamHandler';
import { Constants } from '../interfaces/Constants';
import _ = require('lodash');
import { MemoryDataChannel } from '../dataChannels/MemoryDataChannel';
import { TestDataChannelUpdates } from './TestDataChannelUpdates';

describe('Stream Handler', () => {
    it('should handle request to get all record ids', () => {
        var record: IRecord = {
            id: 'xx'
        };
        var testChannel = new MemoryDataChannel([record]);
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
        var testChannel = new MemoryDataChannel([record]);
        var handler = new StreamHandler(testChannel);
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_READ;
        request.id = record.id;
        var response = handler.processRequest(request);
        expect(response.record).toBeDefined();
        expect(response.record.id).toBe(record.id);
        expect((<any>(response.record)).field1).toBe(record.field1);
    });

    describe('CRUD set', () => {
        it('should update (merge with existing) record for specified id', () => {
            var record = {
                id: 'def',
                field1: 'kl;kl;'
            };
            var testChannel = new MemoryDataChannel([record]);
            var handler = new StreamHandler(testChannel);
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_UPDATE;
            request.echo = true;
            var newField = 'abc';
            request.record = {
                id: record.id,
                field2: newField
            };
            var response = handler.processRequest(request);
            expect(response.record).toBeDefined();
            var responseRecord: any = response.record;
            expect(responseRecord.field1).toBe(record.field1);
            expect(responseRecord.field2).toBe(newField);
            request.echo = false;
            request.record = {
                id: record.id + 'aaa'
            };
            response = handler.processRequest(request);
            expect(response.error).toBeDefined();
            request.record = {
                id: record.id
            };
            response = handler.processRequest(request);
            expect(response.record).toBe(true);
        });

        it('should create new record', () => {
            var testChannel = new MemoryDataChannel();
            var handler = new StreamHandler(testChannel);
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_CREATE;
            var record = {
                id: 'xxx',
                field2: 'abc'
            };
            request.record = record;
            var response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            var records = testChannel.getAllRecords();
            expect(records.length).toBe(1);
            expect(records[0]).toBe(record);
            response = handler.processRequest(request);
            expect(response.error).toBeDefined();
            expect(testChannel.getAllRecords().length).toBe(1);
        });

        it('should delete existing record', () => {
            var record = {
                id: 'x',
                field: 'aaa'
            };
            var testChannel = new MemoryDataChannel([record]);
            var handler = new StreamHandler(testChannel);
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_DELETE;
            request.id = 'xx';
            var response = handler.processRequest(request);
            expect(response.error).toBeDefined();
            expect(testChannel.getAllRecords().length).toBe(1);
            request.id = record.id;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            expect(testChannel.getAllRecords().length).toBe(0);
        });
    });

    describe('Events', () => {
        it('should notify on record changes and handle versions', () => {

            var testChannel = new MemoryDataChannel();
            var handler = new StreamHandler(testChannel);
            var updates = new TestDataChannelUpdates();
            testChannel.subscribe(updates);
            var request: IRequest = <any>{};

            // get version => initialVersion
            request.command = Constants.COMMAND_VERSION;
            var response = handler.processRequest(request);
            expect(response.version).toBeDefined();
            var initialVersion = response.version;

            // create record
            var record: IRecord = {
                id: '123',
                field1: '456'
            };
            request = <any>{};
            request.command = Constants.COMMAND_CREATE;
            request.record = record;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            expect(updates.getUpdates().length).toBe(1);
            expect(_.last(updates.getUpdates()).type).toBe(Constants.UPDATE_CREATED);

            // get version => secondVersion
            request = <any>{};
            request.command = Constants.COMMAND_VERSION;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            var createVersion = response.version;
            expect(createVersion).toBeDefined();
            expect(createVersion).not.toBe(initialVersion);

            // update record
            request = <any>{};
            request.command = Constants.COMMAND_UPDATE;
            request.record = {
                id: record.id,
                field2: '789'
            };
            request.echo = false;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            expect(updates.getUpdates().length).toBe(2);
            expect(_.last(updates.getUpdates()).type).toBe(Constants.UPDATE_CHANGED);

            // get version and verify it is not equal to two previous ones
            request = <any>{};
            request.command = Constants.COMMAND_VERSION;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            var updateVersion = response.version;
            expect(updateVersion).toBeDefined();
            expect(updateVersion).not.toBe(initialVersion);
            expect(updateVersion).not.toBe(createVersion);

            // get changes and check that we receive report for changed record
            request = <any>{};
            request.command = Constants.COMMAND_CHANGES;
            request.version = createVersion;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            expect(response.changes).toBeDefined();
            expect(response.changes.length).toBeGreaterThan(0);
            expect(response.changes[0].type).toBe(Constants.UPDATE_CHANGED);

            // delete record
            request = <any>{};
            request.command = Constants.COMMAND_DELETE;
            request.id = record.id;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            expect(updates.getUpdates().length).toBe(3);
            expect(_.last(updates.getUpdates()).type).toBe(Constants.UPDATE_DELETED);

            // get changes and check that we receive report for deleted record
            request = <any>{};
            request.command = Constants.COMMAND_CHANGES;
            request.version = createVersion;
            response = handler.processRequest(request);
            expect(response.error).not.toBeDefined();
            expect(response.changes).toBeDefined();
            expect(response.changes.length).toBeGreaterThan(1);
            expect(_.last(response.changes).type).toBe(Constants.UPDATE_DELETED);
        });
    });
});
