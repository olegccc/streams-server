import _ = require('lodash');
import { MemoryDataChannel } from '../dataChannels/MemoryDataChannel';
import { Constants } from '../interfaces/Constants';
import { TestDataChannelUpdates } from './TestDataChannelUpdates';

describe('Memory Data Channel', () => {
    describe('Data Filtering', () => {

        var twoRecordsArray = [
            {
                id: 'id1',
                field: 'abc'
            },
            {
                id: 'id2',
                field: 'def'
            },
            {
                id: 'id3',
                field: 100
            }
        ];

        it('should handle regular expression filtering like { a: "b" }', () => {

            var dataChannel = new MemoryDataChannel(twoRecordsArray);

            var filter = {
                field: 'a.c'
            };

            var ids = dataChannel.getIds(filter);

            expect(ids).toEqual(['id1']);
        });

        it('should return filtered updates', () => {
            var filter = {
                field: 'a.c'
            };

            var dataChannel = new MemoryDataChannel();
            var version = dataChannel.getVersion();
            dataChannel.create(twoRecordsArray[0]);
            dataChannel.create(twoRecordsArray[1]);
            var changes = dataChannel.getUpdates(version, filter);
            expect(changes).toEqual([{
                type: Constants.UPDATE_CREATED,
                id: 'id1'
            }]);
        });

        it('should send filtered updates to callback', () => {
            var filter = {
                field: 'a.c'
            };

            var dataChannel = new MemoryDataChannel();
            var listener = new TestDataChannelUpdates();
            dataChannel.subscribe(listener, filter);
            dataChannel.create(twoRecordsArray[0]);
            dataChannel.create(twoRecordsArray[1]);
            var changes = listener.getUpdates();
            expect(changes).toEqual([{
                type: Constants.UPDATE_CREATED,
                id: 'id1'
            }]);
        });

        it('should handle numbered filtering like { a: 10 }', () => {
            var records = [
                {
                    id: 'id1',
                    field: 10
                },
                {
                    id: 'id2',
                    field: 20
                },
                {
                    id: 'id3',
                    field: '20'
                }
            ];

            var dataChannel = new MemoryDataChannel(records);

            var ids = dataChannel.getIds({
                field: 20
            });

            expect(ids).toEqual(['id2']);
        });
    });
});