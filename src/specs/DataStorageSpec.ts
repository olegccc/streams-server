import { DataStorage } from '../dataChannels/DataStorage';
import { NedbDatabaseDataChannel } from '../dataChannels/NedbDatabaseDataChannel';

///<reference path='../interfaces/IDataChannel.ts'/>

describe('Data Storage', () => {
    function dataChannelInitializer(): IDataChannel {
        return new NedbDatabaseDataChannel();
    }

    it('should provide data channels based on configuration', (done) => {
        var dataStorage = new DataStorage({
            channels: {}
        }, dataChannelInitializer);

        var channel = dataStorage.getChannel('channel');
        expect(channel).toBeFalsy();

        dataStorage = new DataStorage({
            channels: {
                channel: {
                    system: true
                }
            }
        }, dataChannelInitializer);

        channel = dataStorage.getChannel('channel');
        expect(channel).toBeTruthy();

        expect(dataStorage.getChannel('channel1')).toBeFalsy();

        var record: any = {
            field: 'abc'
        };

        channel.create(record, (error: Error, record: IRecord) => {
            expect(error).toBeFalsy();
            channel.read(record.id, (error: Error, record: IRecord) => {
                expect(error).toBeFalsy();
                expect(record['field']).toBe('abc');
                done();
            });
        });
    });
});
