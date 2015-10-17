///<reference path='../interfaces/IDataChannel.ts'/>
///<reference path='../interfaces/IDataChannelFactory.ts'/>

export class HashDataChannelFactory implements IDataChannelFactory {

    private channels: { [channelId: string]: IDataChannel};

    constructor(channels: { [channelId: string]: IDataChannel}) {
        this.channels = channels;
    }

    getDataChannel(channelId:string, callback: (error: Error, dataChannel?: IDataChannel) => void):void {
        callback(null, this.channels[channelId]);
    }
}