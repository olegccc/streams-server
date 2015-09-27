///<reference path='../interfaces/IRecord.ts'/>

import { StreamHandler } from '../modules/StreamHandler';
import { Constants } from '../interfaces/Constants';
import _ = require('lodash');
import { MemoryDataChannel } from '../dataChannels/MemoryDataChannel';

describe('Stream Handler', () => {
    it('should handle request to get all record ids', (done) => {
        var record: IRecord = {
            id: 'xx'
        };
        var testChannel = new MemoryDataChannel([record]);
        var handler = new StreamHandler(testChannel);
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_IDS;
        handler.processRequest(request, (response: IResponse) => {
            expect(response.ids).toBeDefined();
            expect(response.ids.length).toBe(1);
            expect(response.ids[0]).toBe(record.id);
            done();
        });
    });

    it('should get record by its id', (done) => {
        var record = { id: 'abc ', field1: 'aaa'};
        var testChannel = new MemoryDataChannel([record]);
        var handler = new StreamHandler(testChannel);
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_READ;
        request.id = record.id;
        handler.processRequest(request, (response: IResponse) => {
            expect(response.record).toBeDefined();
            expect(response.record.id).toBe(record.id);
            expect((<any>(response.record)).field1).toBe(record.field1);
            done();
        });
    });

    describe('CRUD set', () => {
        it('should update (merge with existing) record for specified id', (done) => {
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
            request.record = <any> {
                id: record.id,
                field2: newField
            };
            handler.processRequest(request, (response: IResponse) => {
                expect(response.record).toBeDefined();
                var responseRecord: any = response.record;
                expect(responseRecord.field2).toBe(newField);
                request.echo = false;
                request.record = {
                    id: record.id + 'aaa'
                };
                handler.processRequest(request, (response: IResponse) => {
                    expect(response.error).toBeDefined();
                    request.record = {
                        id: record.id
                    };
                    handler.processRequest(request, (response: IResponse) => {
                        expect(response.record).toBe(true);
                        done();
                    });
                });
            });
        });

        it('should create new record', (done) => {
            var testChannel = new MemoryDataChannel();
            var handler = new StreamHandler(testChannel);
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_CREATE;
            var record = {
                id: 'xxx',
                field2: 'abc'
            };
            request.record = record;
            handler.processRequest(request, (response: IResponse) => {
                expect(response.error).not.toBeDefined();
                var records = testChannel.getAllRecords();
                expect(records.length).toBe(1);
                expect(records[0]).toBe(record);
                handler.processRequest(request, (response: IResponse) => {
                    expect(response.error).toBeDefined();
                    expect(testChannel.getAllRecords().length).toBe(1);
                    done();
                });
            });
        });

        it('should delete existing record', (done) => {
            var record = {
                id: 'x',
                field: 'aaa'
            };
            var testChannel = new MemoryDataChannel([record]);
            var handler = new StreamHandler(testChannel);
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_DELETE;
            request.id = 'xx';
            handler.processRequest(request, (response: IResponse) => {
                expect(response.error).toBeDefined();
                expect(testChannel.getAllRecords().length).toBe(1);
                request.id = record.id;
                handler.processRequest(request, (response: IResponse) => {
                    expect(response.error).not.toBeDefined();
                    expect(testChannel.getAllRecords().length).toBe(0);
                    done();
                });
            });
        });
    });

    describe('Events', () => {
        it('should notify on record changes and handle versions', (done) => {

            var testChannel = new MemoryDataChannel();
            var handler = new StreamHandler(testChannel);
            var request: IRequest = <any>{};

            // get version => initialVersion
            request.command = Constants.COMMAND_VERSION;
            handler.processRequest(request, (response: IResponse) => {
                expect(response.version).toBeDefined();
                var initialVersion = response.version;

                // create record
                var record: IRecord = <any> {
                    id: '123',
                    field1: '456'
                };
                request = <any>{};
                request.command = Constants.COMMAND_CREATE;
                request.record = record;
                handler.processRequest(request, (response: IResponse) => {
                    expect(response.error).not.toBeDefined();

                    // get version => secondVersion
                    request = <any>{};
                    request.command = Constants.COMMAND_VERSION;
                    handler.processRequest(request, (response: IResponse) => {
                        expect(response.error).not.toBeDefined();
                        var createVersion = response.version;
                        expect(createVersion).toBeDefined();
                        expect(createVersion).not.toBe(initialVersion);

                        // update record
                        request = <any>{};
                        request.command = Constants.COMMAND_UPDATE;
                        request.record = <any> {
                            id: record.id,
                            field2: '789'
                        };
                        request.echo = false;
                        handler.processRequest(request, (response: IResponse) => {
                            expect(response.error).not.toBeDefined();

                            // get version and verify it is not equal to two previous ones
                            request = <any>{};
                            request.command = Constants.COMMAND_VERSION;
                            handler.processRequest(request, (response: IResponse) => {
                                expect(response.error).not.toBeDefined();
                                var updateVersion = response.version;
                                expect(updateVersion).toBeDefined();
                                expect(updateVersion).not.toBe(initialVersion);
                                expect(updateVersion).not.toBe(createVersion);

                                // get changes and check that we receive report for changed record
                                request = <any>{};
                                request.command = Constants.COMMAND_CHANGES;
                                request.version = createVersion;
                                handler.processRequest(request, (response: IResponse) => {
                                    expect(response.error).not.toBeDefined();
                                    expect(response.changes).toBeDefined();
                                    expect(response.changes.length).toBeGreaterThan(0);
                                    expect(response.changes[0].type).toBe(Constants.UPDATE_CHANGED);

                                    // delete record
                                    request = <any>{};
                                    request.command = Constants.COMMAND_DELETE;
                                    request.id = record.id;
                                    handler.processRequest(request, (response: IResponse) => {
                                        expect(response.error).not.toBeDefined();

                                        // get changes and check that we receive report for deleted record
                                        request = <any>{};
                                        request.command = Constants.COMMAND_CHANGES;
                                        request.version = createVersion;
                                        handler.processRequest(request, (response: IResponse) => {
                                            expect(response.error).not.toBeDefined();
                                            expect(response.changes).toBeDefined();
                                            expect(response.changes.length).toBeGreaterThan(1);
                                            expect(_.last(response.changes).type).toBe(Constants.UPDATE_DELETED);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
