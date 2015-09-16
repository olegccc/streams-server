///<reference path='../interfaces/IRecord.ts'/>

import { StreamHandler } from '../modules/StreamHandler';
import { Constants } from '../interfaces/Constants';
import _ = require('lodash');
import { TestDataChannel } from './TestDataChannel';
import { TestDataChannelUpdates } from './TestDataChannelUpdates';

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

    describe('CRUD set', () => {
        it('should update (merge with existing) record for specified id', () => {
            var record = {
                id: 'def',
                field1: 'kl;kl;'
            };
            var testChannel = new TestDataChannel([record]);
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
            var testChannel = new TestDataChannel([]);
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
            var testChannel = new TestDataChannel([record]);
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
        it('should notify on record updated and handle versions', () => {
            var testChannel = new TestDataChannel([]);
            var handler = new StreamHandler(testChannel);
            var updates = new TestDataChannelUpdates();
            testChannel.subscribe(updates);
            var request: IRequest = <any>{};

            request.command = Constants.COMMAND_VERSION;
            var response = handler.processRequest(request);
            expect(response.version).toBeDefined();
            var initialVersion = response.version;

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
            request = <any>{};
            request.command = Constants.COMMAND_VERSION;
            response = handler.processRequest(request);
            expect(response.version).toBeDefined();
            expect(response.version).not.toBe(initialVersion);
            var secondVersion = response.version;
            request = <any>{};
            request.command = Constants.COMMAND_UPDATE;
            request.record = {
                id: record.id,
                field2: '789'
            };
            request.echo = false;
            handler.processRequest(request);
            request = <any>{};
            request.command = Constants.COMMAND_VERSION;
            response = handler.processRequest(request);
            expect(response.version).toBeDefined();
            expect(response.version).not.toBe(initialVersion);
            expect(response.version).not.toBe(secondVersion);
            request = <any>{};
            request.command = Constants.COMMAND_CHANGES;
            request.version = secondVersion;
            response = handler.processRequest(request);
            expect(response.changes).toBeDefined();
            expect(response.changes.length).toBe(1);
            expect(response.changes[0].type).toBe(Constants.UPDATE_CHANGED);
        });
    });
});
