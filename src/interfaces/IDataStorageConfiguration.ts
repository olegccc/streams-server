///<reference path='IDataChannelConfiguration.ts'/>

interface IDataStorageConfiguration {
    channels: { [name: string]: IDataChannelConfiguration };
}
