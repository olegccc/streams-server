import { DataStorage } from '../dataChannels/DataStorage';
import { NodeAccessValidator } from '../security/NodeAccessValidator';
import { NedbDatabaseDataChannel } from '../dataChannels/NedbDatabaseDataChannel';
import { SynchronizedTree } from '../structure/SynchronizedTree';
import { SynchronizedDictionary } from '../structure/SynchronizedDictionary';

describe('Node Access Validator', () => {
    it('should handle add or remove rights in tree', (done) => {
        var nodesChannel = new NedbDatabaseDataChannel();
        var rightsChannel = new NedbDatabaseDataChannel();
        var userMembershipChannel = new NedbDatabaseDataChannel();

        var rootNode = <any>{
            id: 'root',
            parentId: null,
            description: 'root'
        };

        var node1 = <any>{
            id: 'node1',
            parentId: 'root',
            description: 'node1'
        };

        var node2 = <any>{
            id: 'node2',
            parentId: 'node1',
            description: 'node2'
        };

        nodesChannel.createMany([rootNode, node1, node2], (error: Error) => {
            expect(error).toBeFalsy();

            var membership1 = <any> {
                userId: 'user1',
                groupId: 'group1'
            };

            var membership2 = <any> {
                userId: 'user2',
                groupId: 'group1'
            };

            userMembershipChannel.createMany([membership1, membership2], (error: Error) => {
                expect(error).toBeFalsy();

                var right1 = <any> {
                    nodeId: rootNode.id,
                    order: 0,
                    userId: null,
                    userGroupId: null,
                    rightId: 'right1',
                    allow: true
                };

                var right2 = <any> {
                    nodeId: node1.id,
                    order: 0,
                    userId: null,
                    userGroupId: 'group1',
                    rightId: 'right2',
                    allow: true
                };

                var right3 = <any> {
                    nodeId: node2.id,
                    order: 0,
                    userId: 'user2',
                    userGroupId: null,
                    rightId: 'right1',
                    allow: false
                };

                rightsChannel.createMany([right1, right2, right3], (error: Error) => {
                    expect(error).toBeFalsy();

                    var nodesTree = new SynchronizedTree(nodesChannel);
                    var rightsSet = new SynchronizedDictionary(rightsChannel, 'nodeId');
                    var membershipSet = new SynchronizedDictionary(userMembershipChannel, 'userId');

                    var nodeAccessValidator = new NodeAccessValidator(nodesTree, rightsSet, membershipSet);

                    nodeAccessValidator.effectiveRights(null, node2.id, (error: Error, rights: string[]) => {
                        expect(error).toBeFalsy();
                        expect(rights).toEqual(['right1']);

                        nodeAccessValidator.effectiveRights(null, null, (error: Error, rights: string[]) => {
                            expect(error).toBeFalsy();
                            expect(rights).toEqual(['right1']);

                            nodeAccessValidator.effectiveRights('user1', node2.id, (error: Error, rights: string[]) => {
                                expect(error).toBeFalsy();
                                expect(rights).toEqual(['right1', 'right2']);

                                nodeAccessValidator.effectiveRights('user2', node2.id, (error: Error, rights: string[]) => {
                                    expect(error).toBeFalsy();
                                    expect(rights).toEqual(['right2']);

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
