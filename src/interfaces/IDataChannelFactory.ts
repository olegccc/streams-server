///<reference path='../interfaces/IDataChannel.ts'/>

interface IDataChannelFactory {
    getDataChannel(channelId: string, callback: (error: Error, dataChannel?: IDataChannel) => void): void;
}
