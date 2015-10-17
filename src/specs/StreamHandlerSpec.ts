///<reference path='../interfaces/IRecord.ts'/>
///<reference path='../interfaces/IDataChannel.ts'/>

import { StreamHandler } from '../modules/StreamHandler';
import { Constants } from '../interfaces/Constants';
import _ = require('lodash');
import { MemoryDataChannel } from '../dataChannels/MemoryDataChannel';
import { NodeAccessValidator } from '../security/NodeAccessValidator';
import { NedbDatabaseDataChannel } from '../dataChannels/NedbDatabaseDataChannel';
import { SynchronizedTree } from '../structure/SynchronizedTree';
import { SynchronizedDictionary } from '../structure/SynchronizedDictionary';
import { HashDataChannelFactory } from '../structure/HashDataChannelFactory';

function createNodeAccessValidator(nodesChannel?: IDataChannel, rightsChannel?: IDataChannel, membershipChannel?: IDataChannel): NodeAccessValidator {
    if (!nodesChannel) {
        nodesChannel = new NedbDatabaseDataChannel();
    }
    if (!rightsChannel) {
        rightsChannel = new NedbDatabaseDataChannel();
    }
    if (!membershipChannel) {
        membershipChannel = new NedbDatabaseDataChannel();
    }
    var nodesTree = new SynchronizedTree(nodesChannel);
    var rightsSet = new SynchronizedDictionary(rightsChannel, 'nodeId');
    var membershipSet = new SynchronizedDictionary(membershipChannel, 'userId');

    return new NodeAccessValidator(nodesTree, rightsSet, membershipSet);
}

function createConfiguration(): IServerConfiguration {
    return <any>{
        access: {
            read: ['read'],
            write: ['read','write']
        },
    };
}

describe('Stream Handler', () => {
    it('should handle request to get all record ids', (done) => {
        var record: IRecord = <any>{
            id: 'xx'
        };
        var testChannel = new MemoryDataChannel([record]);
        var handler = new StreamHandler(null, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_IDS;
        request.streamId = 'id';
        handler.processRequest(request, null, (error: Error, response: IResponse) => {
            expect(error).toBeFalsy();
            if (!error) {
                expect(response.ids).toBeDefined();
                expect(response.ids.length).toBe(1);
                expect(response.ids[0]).toBe(record.id);
            }
            done();
        });
    });

    it('should get record by its id', (done) => {
        var record = <any> { id: 'abc ', field1: 'aaa'};
        var testChannel = new MemoryDataChannel([record]);
        var handler = new StreamHandler(null, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
        var request: IRequest = <any>{};
        request.command = Constants.COMMAND_READ;
        request.id = record.id;
        request.streamId = 'id';
        handler.processRequest(request, null, (error: Error, response: IResponse) => {
            expect(error).toBeFalsy();
            expect(response.record).toBeDefined();
            expect(response.record.id).toBe(record.id);
            expect((<any>(response.record)).field1).toBe(record.field1);
            done();
        });
    });

    it('should handle multiple requests', (done) => {
        var record1 = <any> { id: 'abc', field1: 'aaa'};
        var record2 = <any> { id: 'def', field2: 'bbb'};
        var testChannel1 = new MemoryDataChannel([record1]);
        var testChannel2 = new MemoryDataChannel([record2]);
        var handler = new StreamHandler(null, new HashDataChannelFactory({ id1: testChannel1, id2: testChannel2 }), createConfiguration());
        var request1: IRequest = <any>{};
        request1.command = Constants.COMMAND_READ;
        request1.id = record1.id;
        request1.streamId = 'id1';
        var request2: IRequest = <any>{};
        request2.command = Constants.COMMAND_READ;
        request2.id = record2.id;
        request2.streamId = 'id2';
        handler.processRequests([request1, request2], null, (error: Error, responses: IResponse[]) => {
            expect(error).toBeFalsy();
            expect(responses.length).toBe(2);
            expect(responses[0].record).toBeDefined();
            expect(responses[0].record.id).toBe(record1.id);
            expect((<any>(responses[0].record)).field1).toBe(record1.field1);
            expect(responses[1].record).toBeDefined();
            expect(responses[1].record.id).toBe(record2.id);
            expect((<any>(responses[1].record)).field2).toBe(record2.field2);
            done();
        });
    });

    describe('CRUD set', () => {
        it('should update (merge with existing) record for specified id', (done) => {
            var record = <any> {
                id: 'def',
                field1: 'kl;kl;'
            };
            var testChannel = new MemoryDataChannel([record]);
            var handler = new StreamHandler(null, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_UPDATE;
            request.echo = true;
            request.streamId = 'id';
            var newField = 'abc';
            request.record = <any> {
                id: record.id,
                field2: newField
            };
            handler.processRequest(request, null, (error: Error, response: IResponse) => {
                expect(error).toBeFalsy();
                expect(response.record).toBeDefined();
                var responseRecord: any = response.record;
                expect(responseRecord.field2).toBe(newField);
                request = <any>{};
                request.command = Constants.COMMAND_UPDATE;
                request.echo = false;
                request.streamId = 'id';
                request.record = <any>{
                    id: record.id + 'aaa'
                };
                request.streamId = 'id';
                handler.processRequest(request, null, (error: Error) => {
                    expect(error).toBeDefined();
                    request = <any>{};
                    request.command = Constants.COMMAND_UPDATE;
                    request.echo = false;
                    request.streamId = 'id';
                    request.record = <any>{
                        id: record.id
                    };
                    handler.processRequest(request, null, (error: Error, response: IResponse) => {
                        expect(error).toBeFalsy();
                        expect(response.record).toBe(true);
                        done();
                    });
                });
            });
        });

        it('should create new record', (done) => {
            var testChannel = new MemoryDataChannel();
            var handler = new StreamHandler(null, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_CREATE;
            request.streamId = 'id';
            var record = <any>{
                id: 'xxx',
                field2: 'abc'
            };
            request.record = record;
            handler.processRequest(request, null, (error: Error) => {
                expect(error).toBeFalsy();
                var records = testChannel.getAllRecords();
                expect(records.length).toBe(1);
                expect(records[0]).toBe(record);
                handler.processRequest(request, null, (error: Error) => {
                    expect(error).toBeDefined();
                    expect(testChannel.getAllRecords().length).toBe(1);
                    done();
                });
            });
        });

        it('should delete existing record', (done) => {
            var record = <any> {
                id: 'x',
                field: 'aaa'
            };
            var testChannel = new MemoryDataChannel([record]);
            var handler = new StreamHandler(null, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
            var request: IRequest = <any>{};
            request.command = Constants.COMMAND_DELETE;
            request.id = 'xx';
            request.streamId = 'id';
            handler.processRequest(request, null, (error: Error) => {
                expect(error).toBeTruthy();
                expect(testChannel.getAllRecords().length).toBe(1);
                request.id = record.id;
                handler.processRequest(request, null, (error: Error) => {
                    expect(error).toBeFalsy();
                    expect(testChannel.getAllRecords().length).toBe(0);
                    done();
                });
            });
        });
    });

    describe('Events', () => {
        it('should notify on record changes and handle versions', (done) => {

            var testChannel = new MemoryDataChannel();
            var handler = new StreamHandler(null, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
            var request: IRequest = <any>{};

            // get version => initialVersion
            request.command = Constants.COMMAND_VERSION;
            request.streamId = 'id';
            handler.processRequest(request, null, (error: Error, response: IResponse) => {
                expect(error).toBeFalsy();
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
                request.streamId = 'id';
                handler.processRequest(request, null, (error: Error) => {
                    expect(error).toBeFalsy();

                    // get version => secondVersion
                    request = <any>{};
                    request.command = Constants.COMMAND_VERSION;
                    request.streamId = 'id';
                    handler.processRequest(request, null, (error: Error, response: IResponse) => {
                        expect(error).toBeFalsy();
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
                        request.streamId = 'id';
                        request.echo = false;
                        handler.processRequest(request, null, (error: Error) => {
                            expect(error).toBeFalsy();

                            // get version and verify it is not equal to two previous ones
                            request = <any>{};
                            request.command = Constants.COMMAND_VERSION;
                            request.streamId = 'id';
                            handler.processRequest(request, null, (error: Error, response: IResponse) => {
                                expect(error).toBeFalsy();
                                var updateVersion = response.version;
                                expect(updateVersion).toBeDefined();
                                expect(updateVersion).not.toBe(initialVersion);
                                expect(updateVersion).not.toBe(createVersion);

                                // get changes and check that we receive report for changed record
                                request = <any>{};
                                request.command = Constants.COMMAND_CHANGES;
                                request.version = createVersion;
                                request.streamId = 'id';
                                handler.processRequest(request, null, (error: Error, response: IResponse) => {
                                    expect(error).toBeFalsy();
                                    expect(response.changes).toBeDefined();
                                    expect(response.changes.length).toBeGreaterThan(0);
                                    expect(response.changes[0].type).toBe(Constants.UPDATE_CHANGED);

                                    // delete record
                                    request = <any>{};
                                    request.command = Constants.COMMAND_DELETE;
                                    request.id = record.id;
                                    request.streamId = 'id';
                                    handler.processRequest(request, null, (error: Error) => {
                                        expect(error).toBeFalsy();

                                        // get changes and check that we receive report for deleted record
                                        request = <any>{};
                                        request.command = Constants.COMMAND_CHANGES;
                                        request.version = createVersion;
                                        request.streamId = 'id';
                                        handler.processRequest(request, null, (error: Error, response: IResponse) => {
                                            expect(error).toBeFalsy();
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

    describe('Security', () => {
        it('should calculate access rights for anonymous and concrete user (root tree item access rights)', (done) => {
            var nodesChannel = new NedbDatabaseDataChannel();
            var rightsChannel = new NedbDatabaseDataChannel();
            var rootNode = <any>{
                id: 'root',
                parentId: null,
                description: 'root'
            };
            var right1 = <any> {
                nodeId: rootNode.id,
                order: 0,
                userId: null,
                userGroupId: null,
                rightId: 'read',
                allow: true
            };
            var right2 = <any> {
                nodeId: rootNode.id,
                order: 0,
                userId: 'user1',
                userGroupId: null,
                rightId: 'write',
                allow: true
            };
            nodesChannel.create(rootNode, (error: Error) => {
                expect(error).toBeFalsy();
                rightsChannel.createMany([right1, right2], (error: Error) => {
                    expect(error).toBeFalsy();
                    var validator = createNodeAccessValidator(nodesChannel, rightsChannel);
                    var testChannel = new MemoryDataChannel();
                    var handler = new StreamHandler(validator, new HashDataChannelFactory({ id: testChannel }), createConfiguration());
                    var spy = spyOn(handler, "processRequestWithRights");
                    spy.and.callThrough();
                    var request: IRequest = <any>{};
                    request.command = Constants.COMMAND_IDS;
                    request.streamId = 'id';
                    handler.processRequest(request, null, (error: Error) => {
                        expect(error).toBeFalsy();
                        if (error) {
                            done();
                            return;
                        }
                        expect(handler.processRequestWithRights).toHaveBeenCalled();
                        request = spy.calls.argsFor(0)[0];
                        expect(request.access).toEqual({ read: true });
                        expect(request.rights).toEqual({ read: true });
                        expect(request.streamId).toBe('id');
                        request = <any>{};
                        request.command = Constants.COMMAND_IDS;
                        request.streamId = 'id';
                        var user: IUser = <any> {
                            id: 'user1'
                        };
                        handler.processRequest(request, user, (error: Error) => {
                            expect(error).toBeFalsy();
                            if (!error) {
                                request = spy.calls.argsFor(1)[0];
                                expect(request.access).toEqual({ read: true, write: true });
                                expect(request.rights).toEqual({ read: true, write: true });
                            }
                            done();
                        });
                    });
                })
            });
        });

        _.each([{
            request: {
                streamId: 'id',
                command: Constants.COMMAND_IDS
            }
        }, {
            request: {
                streamId: 'id',
                command: Constants.COMMAND_READ,
                id: 'record1'
            }
        }, {
            request: {
                command: Constants.COMMAND_UPDATE,
                streamId: 'id',
                record: {
                    id: 'record1',
                    field2: 'value'
                }
            },
            write: true
        }, {
            request: {
                command: Constants.COMMAND_CREATE,
                streamId: 'id',
                record: {
                    field: 'value'
                }
            },
            write: true
        }, {
            request: {
                command: Constants.COMMAND_DELETE,
                streamId: 'id',
                id: 'record1'
            },
            write: true
        }, {
            request: {
                streamId: 'id',
                command: Constants.COMMAND_VERSION
            }
        }, {
            request: {
                command: Constants.COMMAND_CHANGES,
                streamId: 'id',
                version: null
            }
        }], (check: any) => {
            it('should check access rights for \'' + check.request.command + '\' command', (done) => {
                var record = <any> {
                    id: 'record1',
                    field: 'aaa'
                };
                var testChannel = new MemoryDataChannel([record]);
                var rootNode = <any>{
                    id: 'root',
                    parentId: null,
                    description: 'root'
                };
                var right1 = <any> {
                    nodeId: rootNode.id,
                    order: 0,
                    userId: 'user1',
                    userGroupId: null,
                    rightId: 'read',
                    allow: true
                };
                var right2 = <any> {
                    nodeId: rootNode.id,
                    order: 0,
                    userId: 'user2',
                    userGroupId: null,
                    rightId: 'write',
                    allow: true
                };
                var nodesChannel = new MemoryDataChannel([rootNode]);
                var rightsChannel = new MemoryDataChannel([right1, right2]);
                var validator = createNodeAccessValidator(nodesChannel, rightsChannel);
                var handler = new StreamHandler(validator, new HashDataChannelFactory({ id: testChannel }), createConfiguration());

                var user1: IUser = <any> {
                    id: 'user1'
                };

                var user2: IUser = <any> {
                    id: 'user2'
                };

                handler.processRequest(_.cloneDeep(check.request), null, (error: Error) => {
                    expect(error).toBeTruthy();
                    if (!error) {
                        done();
                        return;
                    }
                    if (check.write) {
                        handler.processRequest(_.cloneDeep(check.request), user1, (error: Error) => {
                            expect(error).toBeTruthy();
                            if (!error) {
                                done();
                                return;
                            }
                            handler.processRequest(_.cloneDeep(check.request), user2, (error: Error) => {
                                expect(error).toBeFalsy();
                                done();
                            });
                        });
                    } else {
                        handler.processRequest(_.cloneDeep(check.request), user1, (error: Error) => {
                            expect(error).toBeFalsy();
                            done();
                        });
                    }
                });
            });

        });
    });
});
