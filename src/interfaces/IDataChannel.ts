///<reference path='IDataChannelUpdates.ts'/>
///<reference path='IRecord.ts'/>

interface IDataChannel {
    getIds: () => string[];
    read: (id: string) => IRecord;
    update: (record: IRecord) => IRecord;
    create: (record: IRecord) => void;
    remove: (id: string) => void;
    subscribe: (updates: IDataChannelUpdates) => string;
    unsubscribe: (id: string) => void;
    getVersion: () => number;
    getUpdates: (from: number) => IUpdate[];
}
