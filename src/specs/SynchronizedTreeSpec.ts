///<reference path='../interfaces/IDataChannel.ts'/>
///<reference path='../interfaces/IDataStorageConfiguration.ts'/>
///<reference path='../interfaces/INode.ts'/>

import { SynchronizedTree } from '../structure/SynchronizedTree';
import { DataStorage } from '../dataChannels/DataStorage';
import { NedbDatabaseDataChannel } from '../dataChannels/NedbDatabaseDataChannel';
import { Constants } from '../interfaces/Constants';

interface ITestNode extends INode {
    description: string;
    name: string;
}

describe('Synchronized Tree', () => {
    it('should update contents based on new tree item added', (done) => {
        var dataChannel = new NedbDatabaseDataChannel();
        var tree = new SynchronizedTree(dataChannel);
        tree.setCacheUpdateInterval(0); // to update it for each request
        var node: ITestNode = <any> {
            id: 'abc',
            parentId: null,
            name: 'node1',
            description: 'description'
        };
        dataChannel.create(node, (error: Error) => {
            expect(error).toBeFalsy();
            tree.getRootNode((error: Error, rootNode: ITestNode) => {
                expect(error).toBeFalsy();
                expect(rootNode).toBeTruthy();
                expect(rootNode.description).toBe(node.description);
                expect(rootNode.children.length).toBe(0);

                var child1: ITestNode = <any> {
                    id: 'def',
                    parentId: rootNode.id,
                    name: 'node2',
                    description: 'description2'
                };

                var child2: ITestNode = <any> {
                    id: 'ghi',
                    parentId: 'def',
                    name: 'node3',
                    description: 'description3'
                };

                dataChannel.createMany([child1, child2], (error: Error) => {
                    expect(error).toBeFalsy();
                    tree.getRootNode((error: Error, rootNode: INode) => {
                        expect(rootNode.children.length).toBe(1);
                        var child = rootNode.children[0];
                        expect(child['name']).toBe(child1['name']);
                        expect(child.children.length).toBe(1);
                        child = child.children[0];
                        expect(child['name']).toBe(child2['name']);
                        dataChannel.remove(child2.id, (error: Error) => {
                            expect(error).toBeFalsy();
                            tree.getRootNode((error: Error, rootNode: INode) => {
                                expect(error).toBeFalsy();
                                expect(rootNode.children.length).toBe(1);
                                expect(rootNode.children[0].children.length).toBe(0);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it('should give concrete node by its id', (done) => {
        var node1: ITestNode = <any> {
            id: 'abc',
            parentId: null,
            name: 'node1',
            description: 'description'
        };
        var node2: ITestNode = <any> {
            id: 'def',
            parentId: node1.id,
            name: 'node2',
            description: 'description2'
        };
        var dataChannel = new NedbDatabaseDataChannel();
        var tree = new SynchronizedTree(dataChannel);
        tree.setCacheUpdateInterval(0); // to update it for each request
        dataChannel.createMany([node1, node2], (error: Error) => {
            expect(error).toBeFalsy();
            tree.getNodeById(node2.id, (error: Error, node: ITestNode) => {
                expect(error).toBeFalsy();
                expect(node.name).toBe(node2.name);
                done();
            });
        });
    });
});
